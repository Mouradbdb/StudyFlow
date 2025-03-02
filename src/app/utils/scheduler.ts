export interface Subject {
  name: string;
  hours: number;
  priority: "High" | "Medium" | "Low";
  color?: string;
}

export interface FreeTime {
  day: string; // e.g., "Monday"
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface ScheduleSlot {
  day: string; // e.g., "Monday"
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateSchedule(
  subjects: Subject[],
  freeTimes: FreeTime[],
  breakDuration: number = 15,
  slotDuration: number = 120, // Renamed from maxSlotDuration
  maxDailyHours: number = 8
): ScheduleSlot[] {
  if (!subjects.length || !freeTimes.length) return [];
  if (breakDuration < 5 || breakDuration > 60 || slotDuration < 30 || slotDuration > 240) {
    throw new Error("Break duration must be 5-60 minutes; slot duration must be 30-240 minutes.");
  }
  if (maxDailyHours < 1 || maxDailyHours > 24) throw new Error("Max daily hours must be 1-24.");

  const remainingSubjects = subjects.map(s => ({ ...s, remainingHours: s.hours }));
  const totalStudyHours = remainingSubjects.reduce((sum, s) => sum + s.hours, 0);
  if (totalStudyHours <= 0) return [];

  const freeTimeSlots: { day: string; start: number; end: number }[] = [];
  const dailyLimits = new Map<string, number>();
  const shuffledFreeTimes = shuffleArray(freeTimes);

  for (const ft of shuffledFreeTimes) {
    try {
      const start = timeToMinutes(ft.start);
      const end = timeToMinutes(ft.end);
      if (start >= end) {
        console.warn(`Skipping invalid free time slot: ${ft.day} ${ft.start}-${ft.end}`);
        continue;
      }
      freeTimeSlots.push({ day: ft.day, start, end });
      dailyLimits.set(ft.day, dailyLimits.get(ft.day) || maxDailyHours * 60);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown time parsing error";
      console.warn(`Invalid time format in ${ft.day}: ${errorMessage}`);
    }
  }

  const totalFreeMinutes = freeTimeSlots.reduce((sum, ft) => sum + (ft.end - ft.start), 0);
  if (totalFreeMinutes < totalStudyHours * 60) {
    throw new Error("Insufficient free time to schedule study hours.");
  }

  const schedule: ScheduleSlot[] = [];

  for (const slot of freeTimeSlots) {
    let currentTime = slot.start;
    const slotEnd = slot.end;
    let hasStudySlot = false;
    let dailyRemaining = dailyLimits.get(slot.day) || 0;

    while (currentTime < slotEnd && remainingSubjects.length > 0 && dailyRemaining > 0) {
      const shuffledSubjects = shuffleArray(remainingSubjects);
      const subject = shuffledSubjects[0];

      const availableMinutes = Math.min(slotEnd - currentTime, dailyRemaining);
      if (availableMinutes < slotDuration) break;

      if (hasStudySlot && availableMinutes >= (breakDuration + slotDuration) && remainingSubjects.length > 0) {
        const breakEnd = currentTime + breakDuration;
        if (breakEnd <= slotEnd && breakDuration <= dailyRemaining) {
          schedule.push({
            day: slot.day,
            start: minutesToTime(currentTime),
            end: minutesToTime(breakEnd),
            subject: "Break",
            completed: false,
          });
          currentTime = breakEnd;
          dailyRemaining -= breakDuration;
        }
      }

      const studyMinutes = Math.min(slotDuration, subject.remainingHours * 60); // Fixed to slotDuration or remaining hours
      const studyEnd = currentTime + studyMinutes;

      if (studyEnd > slotEnd || studyMinutes > dailyRemaining) {
        break; // Skip if not enough time for a full slot
      }

      schedule.push({
        day: slot.day,
        start: minutesToTime(currentTime),
        end: minutesToTime(studyEnd),
        subject: subject.name,
        completed: false,
        color: subject.color,
      });

      subject.remainingHours -= studyMinutes / 60;
      if (subject.remainingHours <= 0) remainingSubjects.splice(remainingSubjects.indexOf(subject), 1);
      currentTime = studyEnd;
      dailyRemaining -= studyMinutes;
      hasStudySlot = true;
      dailyLimits.set(slot.day, dailyRemaining);
    }
  }

  const unscheduledHours = remainingSubjects.reduce((sum, s) => sum + s.remainingHours, 0);
  if (unscheduledHours > 0) {
    console.warn(`Could not schedule ${unscheduledHours.toFixed(1)} hours due to daily limits or insufficient free time.`);
  }

  return schedule;
}