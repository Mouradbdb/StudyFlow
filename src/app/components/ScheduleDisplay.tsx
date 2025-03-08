"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion, AnimatePresence } from "framer-motion";
import { EventClickArg } from "@fullcalendar/core";

interface ScheduleSlot {
  day: string;
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: { completed: boolean; index: number };
  classNames?: string[];
}
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export default function ScheduleDisplay({
  schedule,
  onToggleComplete,
  progress,
  isPremium,
}: {
  schedule: ScheduleSlot[];
  onToggleComplete: (index: number) => void;
  progress: number;
  isPremium: boolean;
}) {

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

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

  const handleEventClick = (info: EventClickArg) => {
    const index = info.event.extendedProps.index;
    onToggleComplete(index);
  };

  const handleViewChange = (newView: "list" | "calendar") => {
    if (newView === "calendar" && !isPremium) {
      setShowPremiumModal(true);
    } else {
      setViewMode(newView);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-6 sm:mt-10"
    >
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <motion.h2
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="text-xl sm:text-2xl font-bold text-notion-text dark:text-notion-dark-text mb-4 sm:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red"
        >
          Your Weekly Study Plan
        </motion.h2>
        <div className="flex gap-3">
          {["list", "calendar"].map((mode) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleViewChange(mode as "list" | "calendar")}
              className={`px-3 py-2 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 ${viewMode === mode
                ? "bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white"
                : "bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70"
                }`}
            >
              {mode === "list" ? "List View" : "Calendar View"}
            </motion.button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6 bg-white dark:bg-notion-dark-card p-4 rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center text-notion-text dark:text-notion-dark-text text-sm">
          <span className="mb-2 sm:mb-0">
            Total Study Hours: <span className="font-medium">{totalHours.toFixed(1)}</span>
          </span>
          <span className="mb-2 sm:mb-0">
            Completed: <span className="font-medium">{Math.round(progress)}%</span>
          </span>
          <span>
            Days Planned:{" "}
            <span className="font-medium">{groupedSchedule.filter((g) => g.slots.length > 0).length}/7</span>
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <div className="w-full bg-notion-gray/30 dark:bg-notion-dark-gray/30 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-gradient-to-r from-notion-blue to-notion-dark-blue h-3 rounded-full"
          />
        </div>
        <p className="text-xs text-notion-text/70 dark:text-notion-dark-secondary mt-2 text-center">
          {Math.round(progress)}% Complete
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            {groupedSchedule.map(({ day, slots }, index) => (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20 p-6 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-notion-text dark:text-notion-dark-text mb-4">{day}</h3>
                {slots.length > 0 ? (
                  <div className="space-y-3">
                    {slots.map((slot, i) => {
                      const globalIndex = schedule.findIndex(
                        (s) =>
                          s.day === slot.day &&
                          s.start === slot.start &&
                          s.subject === slot.subject &&
                          s.end === slot.end
                      );
                      return (
                        <motion.div
                          key={`${day}-${i}`}
                          whileHover={{ scale: 1.02 }}
                          className={`flex items-center p-3 rounded-lg transition-all duration-300 ${slot.completed ? "opacity-60 bg-notion-gray/20 dark:bg-notion-dark-gray/20" : ""
                            }`}
                          style={{ backgroundColor: slot.completed ? undefined : slot.color }}
                        >
                          <input
                            type="checkbox"
                            checked={slot.completed}
                            onChange={() => onToggleComplete(globalIndex)}
                            className="mr-3 text-notion-blue dark:text-notion-dark-blue focus:ring-notion-blue dark:focus:ring-notion-dark-blue w-5 h-5 cursor-pointer"
                          />
                          <span
                            className={`flex-1 font-medium text-sm ${slot.color ? "text-[#333333]" : "text-notion-text dark:text-notion-dark-text"
                              }`}
                          >
                            {slot.subject}
                          </span>
                          <span className="text-notion-blue dark:text-notion-dark-blue text-xs font-medium">
                            {slot.start} – {slot.end}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-notion-text/50 dark:text-notion-dark-secondary italic text-sm">
                    No study slots scheduled
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-notion-dark-card p-4 rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
          >
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
              eventClassNames={(arg) => (arg.event.extendedProps.completed ? ["opacity-60"] : [])}
              height="auto"
              dayHeaderFormat={{ weekday: "short" }}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              contentHeight="auto"
              themeSystem="standard"
              dayHeaderClassNames="text-notion-text dark:text-notion-dark-text bg-notion-bg dark:bg-notion-dark-bg border-notion-gray/30 dark:border-notion-dark-gray/30 text-sm font-medium"
              slotLabelClassNames="text-notion-text/70 dark:text-notion-dark-secondary text-xs"
              eventContent={(arg) => (
                <div className="p-1">
                  <span className="font-medium text-sm">{arg.event.title}</span>
                  <br />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{arg.timeText}</span>
                </div>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-notion-dark-card p-8 rounded-2xl shadow-2xl max-w-md w-full border border-notion-gray/20 dark:border-notion-dark-gray/20"
            >
              <h2 className="text-2xl font-bold text-notion-text dark:text-notion-dark-text mb-4">
                Unlock Premium Benefits
              </h2>
              <p className="text-notion-text dark:text-notion-dark-text mb-6 text-sm leading-relaxed">
                Calendar View is a Premium feature. Upgrade to unlock this and more, including unlimited plans and
                advanced scheduling!
              </p>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPremiumModal(false)}
                  className="flex-1 py-3 px-4 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-xl hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-200"
                >
                  Maybe Later
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="/pricing"
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-xl text-center font-medium hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 shadow-md"
                >
                  Go Premium
                </motion.a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}