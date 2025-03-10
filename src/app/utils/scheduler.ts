export interface Subject {
  name: string;
  hours: number;
  priority: "High" | "Medium" | "Low";
  color?: string;
}

export interface FreeTime {
  day: string; // e.g., "Monday"
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface ScheduleSlot {
  day: string;
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function generateSchedule(
  subjects: Subject[],
  freeTimes: FreeTime[],
  breakDuration: number = 5,
  slotDuration: number = 120, // Default 2 hours
  maxDailyHours: number = 8
): ScheduleSlot[] {
  if (!subjects.length || !freeTimes.length) return [];

  // Sort subjects by priority (High → Medium → Low)
  const priorityGroups = {
    High: subjects.filter(s => s.priority === "High").map(s => ({ ...s, remainingHours: s.hours })),
    Medium: subjects.filter(s => s.priority === "Medium").map(s => ({ ...s, remainingHours: s.hours })),
    Low: subjects.filter(s => s.priority === "Low").map(s => ({ ...s, remainingHours: s.hours })),
  };

  const schedule: ScheduleSlot[] = [];
  const dailyStudyLimits = new Map<string, number>();

  // Process free time slots
  for (const ft of freeTimes) {
    const start = timeToMinutes(ft.start);
    const end = timeToMinutes(ft.end);
    if (start >= end) continue;

    let currentTime = start;
    dailyStudyLimits.set(ft.day, dailyStudyLimits.get(ft.day) ?? maxDailyHours * 60);
    let dailyStudyRemaining = dailyStudyLimits.get(ft.day)!;

    while (currentTime < end && dailyStudyRemaining > 0) {
      // Select next subject by priority
      let subjectGroup: typeof priorityGroups["High"] | undefined;
      if (priorityGroups.High.length) subjectGroup = priorityGroups.High;
      else if (priorityGroups.Medium.length) subjectGroup = priorityGroups.Medium;
      else if (priorityGroups.Low.length) subjectGroup = priorityGroups.Low;
      else break;

      const subject = subjectGroup[0];
      const halfSlotDuration = slotDuration / 2;

      // Determine study duration: full slotDuration or half if not enough time
      let studyMinutes: number;
      const remainingFreeTime = end - currentTime;
      const remainingSubjectTime = subject.remainingHours * 60;
      const remainingDailyTime = dailyStudyRemaining;

      if (
        remainingFreeTime >= slotDuration &&
        remainingSubjectTime >= slotDuration &&
        remainingDailyTime >= slotDuration
      ) {
        studyMinutes = slotDuration; // Use full slot duration
      } else if (
        remainingFreeTime >= halfSlotDuration &&
        remainingSubjectTime >= halfSlotDuration &&
        remainingDailyTime >= halfSlotDuration
      ) {
        studyMinutes = halfSlotDuration; // Use half slot duration
      } else {
        break; // Not enough time for even half a slot
      }

      const studyEnd = currentTime + studyMinutes;
      schedule.push({
        day: ft.day,
        start: minutesToTime(currentTime),
        end: minutesToTime(studyEnd),
        subject: subject.name,
        completed: false,
        color: subject.color,
      });

      subject.remainingHours -= studyMinutes / 60;
      dailyStudyRemaining -= studyMinutes;
      currentTime = studyEnd;

      // Cycle subject within its priority group
      if (subject.remainingHours > 0) {
        subjectGroup.push(subjectGroup.shift()!);
      } else {
        subjectGroup.shift();
      }

      // Add break if time allows
      if (currentTime + breakDuration <= end) {
        const breakEnd = currentTime + breakDuration;
        schedule.push({
          day: ft.day,
          start: minutesToTime(currentTime),
          end: minutesToTime(breakEnd),
          subject: "Break",
          completed: false,
        });
        currentTime = breakEnd;
      }
    }

    dailyStudyLimits.set(ft.day, dailyStudyRemaining);
  }

  return schedule;
}