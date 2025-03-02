"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

interface ScheduleSlot { day: string; start: string; end: string; subject: string; completed: boolean; color?: string }

export default function ScheduleDisplay({
  schedule,
  onToggleComplete,
  progress,
}: {
  schedule: ScheduleSlot[];
  onToggleComplete: (index: number) => void;
  progress: number;
}) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const totalHours = schedule
    .filter((slot) => slot.subject !== "Break")
    .reduce((sum, slot) => {
      const [startH, startM] = slot.start.split(":").map(Number);
      const [endH, endM] = slot.end.split(":").map(Number);
      return sum + (endH + endM / 60 - (startH + startM / 60));
    }, 0);

  const groupedSchedule = days.map((day) => ({
    day,
    slots: schedule.filter((slot) => slot.day === day),
  }));

  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

    const events = schedule.map((slot, index) => {
      const dayIndex = days.indexOf(slot.day);
      const eventDate = new Date(startOfWeek);
      eventDate.setDate(startOfWeek.getDate() + dayIndex);

      const startTime = `${slot.start}:00`;
      const endTime = `${slot.end}:00`;
      const startDateTime = `${eventDate.toISOString().split("T")[0]}T${startTime}`;
      const endDateTime = `${eventDate.toISOString().split("T")[0]}T${endTime}`;

      return {
        id: String(index),
        title: slot.subject,
        start: startDateTime,
        end: endDateTime,
        backgroundColor: slot.color || (slot.subject === "Break" ? "#D3D3D3" : "#E0E0E0"),
        borderColor: slot.color || "#E0E0E0",
        textColor: slot.color ? "#333333" : "#1A1A1A",
        extendedProps: { completed: slot.completed, index },
        classNames: slot.completed ? ["opacity-50"] : [],
      };
    });
    setCalendarEvents(events);
  }, [schedule]);

  const handleEventClick = (info: any) => {
    const index = info.event.extendedProps.index;
    onToggleComplete(index);
  };

  return (
    <div className="mt-6 sm:mt-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-notion-text dark:text-notion-dark-text mb-2 sm:mb-0">Your Weekly Study Plan</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode("list")}
            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ${
              viewMode === "list"
                ? "bg-notion-blue dark:bg-notion-dark-blue text-white"
                : "bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ${
              viewMode === "calendar"
                ? "bg-notion-blue dark:bg-notion-dark-blue text-white"
                : "bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80"
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>
      <div className="mb-4 sm:mb-6 bg-white dark:bg-notion-dark-card p-3 sm:p-4 rounded-xl shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between text-notion-text dark:text-notion-dark-text text-sm sm:text-base">
          <span className="mb-1 sm:mb-0">Total Study Hours: {totalHours.toFixed(1)}</span>
          <span className="mb-1 sm:mb-0">Completed: {Math.round(progress)}%</span>
          <span>Days Planned: {groupedSchedule.filter((g) => g.slots.length > 0).length}/7</span>
        </div>
      </div>
      <div className="mb-4 sm:mb-6">
        <div className="w-full bg-notion-gray dark:bg-notion-dark-gray rounded-full h-2.5 transition-colors duration-300">
          <div
            className="bg-notion-blue dark:bg-notion-dark-blue h-2.5 rounded-full transition-colors duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-xs sm:text-sm text-notion-text/70 dark:text-notion-dark-secondary mt-1">{Math.round(progress)}% Complete</p>
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {groupedSchedule.map(({ day, slots }) => (
            <div
              key={day}
              className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray p-4 sm:p-6 transition-all duration-300 hover:shadow-lg"
            >
              <h3 className="text-base sm:text-lg font-semibold text-notion-text dark:text-notion-dark-text mb-3 sm:mb-4">{day}</h3>
              {slots.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {slots.map((slot, i) => {
                    const globalIndex = schedule.findIndex(
                      (s) => s.day === slot.day && s.start === slot.start && s.subject === slot.subject && s.end === slot.end
                    );
                    return (
                      <div
                        key={`${day}-${i}`}
                        className={`flex items-center p-2 sm:p-3 rounded-lg transition-colors duration-300 ${
                          slot.completed ? "opacity-50" : ""
                        }`}
                        style={{ backgroundColor: slot.color || "inherit" }}
                      >
                        <input
                          type="checkbox"
                          checked={slot.completed}
                          onChange={() => onToggleComplete(globalIndex)}
                          className="mr-2 sm:mr-3 text-notion-blue dark:text-notion-dark-blue focus:ring-notion-blue dark:focus:ring-notion-dark-blue w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span
                          className={`flex-1 font-medium text-sm sm:text-base text-[#1A1A1A] dark:text-[#FFFFFF] ${
                            slot.color ? "dark:text-[#333333]" : ""
                          }`}
                        >
                          {slot.subject}
                        </span>
                        <span className="text-notion-blue dark:text-notion-dark-blue text-xs sm:text-sm">
                          {slot.start} – {slot.end}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-notion-text/50 dark:text-notion-dark-secondary italic text-sm">No study slots scheduled</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-notion-dark-card p-2 sm:p-4 rounded-xl shadow-md">
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={calendarEvents}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "timeGridWeek,timeGridDay",
            }}
            titleFormat={{ weekday: "short" }}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:15:00"
            eventClick={handleEventClick}
            eventClassNames={(arg) => (arg.event.extendedProps.completed ? ["opacity-50"] : [])}
            height="auto"
            dayHeaderFormat={{ weekday: "short" }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            contentHeight="auto"
            themeSystem="standard"
            dayHeaderClassNames="text-notion-text dark:text-notion-dark-text bg-notion-bg dark:bg-notion-dark-bg border-notion-gray dark:border-notion-dark-gray text-xs sm:text-sm"
            slotLabelClassNames="text-notion-text/70 dark:text-notion-dark-secondary text-xs sm:text-sm"
            eventContent={(arg) => (
              <div className="p-1">
                <span className="font-medium text-xs sm:text-sm">{arg.event.title}</span>
                <br />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {arg.timeText}
                </span>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}