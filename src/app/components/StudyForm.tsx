"use client";

import { useState } from "react";
import { toast } from "sonner"; // Import toast from sonner

interface Subject { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }
interface FreeTime { day: string; start: string; end: string }

export default function StudyForm({
  onSubmit,
  onLoadTemplate,
}: {
  onSubmit: (
    subjects: Subject[],
    freeTimes: FreeTime[],
    breakDuration: number,
    slotDuration: number,
    maxDailyHours: number
  ) => void;
  onLoadTemplate: () => { subjects: Subject[]; freeTimes: FreeTime[] } | null;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [hours, setHours] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [color, setColor] = useState("");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [breakDuration, setBreakDuration] = useState(15);
  const [slotDuration, setSlotDuration] = useState(120);
  const [maxDailyHours, setMaxDailyHours] = useState(8);

  const predefinedColors = [
    "#F28B82", "#FBCB9C", "#FFE082", "#CCFF90", "#A7FFEB",
    "#80DEEA", "#82B1FF", "#B388FF", "#F8BBD0",
  ];

  const addSubject = () => {
    const hoursNum = parseInt(hours);
    if (!subjectName || !hours || hoursNum <= 0) {
      toast.error("Please enter a valid subject name and positive hours!");
      return;
    }
    setSubjects([...subjects, { name: subjectName, hours: hoursNum, priority, color: color || undefined }]);
    setSubjectName("");
    setHours("");
    setColor("");
  };

  const addFreeTime = () => {
    if (!day || !start || !end) {
      toast.error("Please fill in all free time fields!");
      return;
    }
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    if (startH > endH || (startH === endH && startM >= endM)) {
      toast.error("End time must be after start time!");
      return;
    }
    setFreeTimes([...freeTimes, { day, start, end }]);
    setDay("");
    setStart("");
    setEnd("");
  };

  const handleSubmit = () => {
    if (subjects.length === 0 || freeTimes.length === 0) {
      toast.error("Please add at least one subject and one free time slot!");
      return;
    }
    const totalStudyHours = subjects.reduce((sum, s) => sum + s.hours, 0);
    const totalFreeHours = freeTimes.reduce((sum, ft) => {
      const [startH, startM] = ft.start.split(":").map(Number);
      const [endH, endM] = ft.end.split(":").map(Number);
      return sum + (endH + endM / 60 - (startH + startM / 60));
    }, 0);

    if (totalFreeHours < totalStudyHours) {
      toast.error("Total free time must be sufficient for study hours!");
      return;
    }
    onSubmit(subjects, freeTimes, breakDuration, slotDuration, maxDailyHours);
  };

  const loadTemplate = () => {
    const template = onLoadTemplate();
    if (!template) {
      toast.error("No template found!");
      return;
    }
    setSubjects(template.subjects);
    setFreeTimes(template.freeTimes);
    toast.success("Template loaded successfully!");
  };

  const populateTestData = () => {
    const testSubjects: Subject[] = [
      { name: "Math", hours: 6, priority: "High", color: predefinedColors[0] },
      { name: "Physics", hours: 4, priority: "Medium", color: predefinedColors[1] },
      { name: "History", hours: 3, priority: "Low", color: predefinedColors[2] },
      { name: "English", hours: 5, priority: "Medium", color: predefinedColors[3] },
    ];
    const testFreeTimes: FreeTime[] = [
      { day: "Monday", start: "09:00", end: "17:00" },
      { day: "Tuesday", start: "10:00", end: "14:00" },
      { day: "Wednesday", start: "13:00", end: "17:00" },
      { day: "Thursday", start: "09:00", end: "12:00" },
      { day: "Friday", start: "14:00", end: "18:00" },
    ];
    setSubjects(testSubjects);
    setFreeTimes(testFreeTimes);
    setBreakDuration(15);
    setSlotDuration(120);
    setMaxDailyHours(8);
    toast.success("Test data populated successfully!");
  };

  // Rest of the component remains unchanged
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">Subjects</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,auto,auto,auto,auto] items-center">
          <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g., Math" className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" />
          <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" min="1" className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300">
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <div className="flex flex-wrap gap-2 items-center">
            {predefinedColors.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-notion-blue" : "border-notion-gray"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={addSubject} className="bg-notion-blue dark:bg-notion-dark-blue text-white py-2 px-4 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300">Add</button>
        </div>
        {subjects.length > 0 && (
          <ul className="mt-4 space-y-2">
            {subjects.map((s, i) => (
              <li key={i} className="flex justify-between items-center p-3 bg-notion-bg dark:bg-notion-dark-bg rounded-lg transition-colors duration-300">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: s.color || "transparent" }}></span>
                  <span className="text-notion-text dark:text-notion-dark-text">{s.name} ({s.priority})</span>
                </div>
                <span className="text-notion-text/70 dark:text-notion-dark-secondary">{s.hours} hrs</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">Free Time</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,1fr,1fr,auto] items-center">
          <select value={day} onChange={(e) => setDay(e.target.value)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300">
            <option value="">Select Day</option>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" />
          <button onClick={addFreeTime} className="bg-notion-blue dark:bg-notion-dark-blue text-white py-2 px-4 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300">Add</button>
        </div>
        {freeTimes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {freeTimes.map((ft, i) => (
              <li key={i} className="flex justify-between items-center p-3 bg-notion-bg dark:bg-notion-dark-bg rounded-lg transition-colors duration-300">
                <span className="text-notion-text dark:text-notion-dark-text">{ft.day}</span>
                <span className="text-notion-text/70 dark:text-notion-dark-secondary">{ft.start} - {ft.end}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">Break Duration (minutes):</label>
            <input type="number" value={breakDuration} onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" min="5" max="60" step="5" placeholder="e.g., 15" />
          </div>
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">Study Slot Duration (minutes):</label>
            <input type="number" value={slotDuration} onChange={(e) => setSlotDuration(parseInt(e.target.value) || 0)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" min="30" max="240" step="15" placeholder="e.g., 120" />
          </div>
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">Max Daily Hours:</label>
            <input type="number" value={maxDailyHours} onChange={(e) => setMaxDailyHours(parseInt(e.target.value) || 0)} className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300" min="1" max="24" step="1" placeholder="e.g., 8" />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-notion-red dark:bg-notion-dark-red text-white py-3 rounded-lg hover:bg-notion-red/90 dark:hover:bg-notion-dark-red/90 hover:shadow-md transition-all duration-300 font-semibold"
        >
          {subjects.length > 0 && freeTimes.length > 0 ? "Regenerate Study Plan" : "Generate Study Plan"}
        </button>
        <button onClick={loadTemplate} className="flex-1 bg-notion-yellow dark:bg-notion-dark-yellow text-notion-text dark:text-notion-dark-text py-3 rounded-lg hover:bg-notion-yellow/90 dark:hover:bg-notion-dark-yellow/90 hover:shadow-md transition-all duration-300 font-semibold">Load Template</button>
        <button onClick={populateTestData} className="flex-1 bg-notion-blue dark:bg-notion-dark-blue text-white py-3 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300 font-semibold">Populate Test Data</button>
      </div>
    </div>
  );
}