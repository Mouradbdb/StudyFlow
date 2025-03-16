"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion, AnimatePresence } from "framer-motion";
import { EventClickArg } from "@fullcalendar/core";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Edit2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface ScheduleSlot {
  day: string; // Stored in English (e.g., "Monday")
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
  notes?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: { completed: boolean; originalIndex: number };
  classNames?: string[];
}

// English day names for internal logic (matches schedule data)
const dayKeys = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Animation variants for smoother transitions
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } },
};

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2, ease: "easeOut" } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.05 },
  }),
  hover: { scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeInOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "easeInOut" } },
};

export default function ScheduleDisplay({
  schedule: initialSchedule,
  onToggleComplete,
  progress,
  isPremium,
}: {
  schedule: ScheduleSlot[];
  onToggleComplete: (index: number) => void;
  progress: number;
  isPremium: boolean;
}) {
  const t = useTranslations("ScheduleDisplay"); // Namespace for schedule display
  const tCommon = useTranslations("Common"); // Namespace for common translations (days)

  // Map English day names to translated labels for rendering
  const displayDays = dayKeys.map((day) => ({
    value: day, // English value for internal use
    label: tCommon(`days.${day}`), // Translated label for display
  }));

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [slotMinTime, setSlotMinTime] = useState<string>("06:00:00");
  const [slotMaxTime, setSlotMaxTime] = useState<string>("22:00:00");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [viewNotesIndex, setViewNotesIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(initialSchedule);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const totalHours = schedule
    .filter((slot) => slot.subject !== "Break")
    .reduce((sum, slot) => {
      const [startH, startM] = slot.start.split(":").map(Number);
      const [endH, endM] = slot.end.split(":").map(Number);
      return sum + (endH + endM / 60 - (startH + startM / 60));
    }, 0);

  // Group schedule using translated labels but filter by English keys
  const groupedSchedule = displayDays.map(({ value, label }) => ({
    day: label, // Translated name for rendering
    slots: schedule.filter((slot) => slot.day === value), // English key for logic
  }));

  const calculateTimeRange = (slots: ScheduleSlot[]) => {
    if (slots.length === 0) {
      return { minTime: "06:00:00", maxTime: "22:00:00" };
    }
    const times = slots.flatMap((slot) => [slot.start, slot.end]);
    const sortedTimes = times
      .map((time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      })
      .sort((a, b) => a - b);
    const minMinutes = Math.max(0, sortedTimes[0] - 120);
    const maxMinutes = Math.min(1440, sortedTimes[sortedTimes.length - 1] + 120);
    const minHours = Math.floor(minMinutes / 60).toString().padStart(2, "0");
    const minMins = (minMinutes % 60).toString().padStart(2, "0");
    const maxHours = Math.floor(maxMinutes / 60).toString().padStart(2, "0");
    const maxMins = (maxMinutes % 60).toString().padStart(2, "0");
    return {
      minTime: `${minHours}:${minMins}:00`,
      maxTime: `${maxHours}:${maxMins}:00`,
    };
  };

  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const events = schedule
      .map((slot, originalIndex) => ({ slot, originalIndex }))
      .filter(({ slot }) => slot.subject !== "Break")
      .map(({ slot, originalIndex }) => {
        const dayIndex = dayKeys.indexOf(slot.day); // Use English key for logic
        const eventDate = new Date(startOfWeek);
        eventDate.setDate(startOfWeek.getDate() + dayIndex);
        const startTime = `${slot.start}:00`;
        const endTime = `${slot.end}:00`;
        const startDateTime = `${eventDate.toISOString().split("T")[0]}T${startTime}`;
        const endDateTime = `${eventDate.toISOString().split("T")[0]}T${endTime}`;
        return {
          id: String(originalIndex),
          title: slot.subject,
          start: startDateTime,
          end: endDateTime,
          backgroundColor: slot.color || "#E0E0E0",
          borderColor: slot.completed ? "#4CAF50" : slot.color || "#E0E0E0",
          textColor: slot.color ? "#333333" : "#1A1A1A",
          extendedProps: { completed: slot.completed, originalIndex },
          classNames: slot.completed ? ["opacity-70"] : [],
        };
      });
    setCalendarEvents(events);
    const { minTime, maxTime } = calculateTimeRange(schedule);
    setSlotMinTime(minTime);
    setSlotMaxTime(maxTime);
  }, [schedule]);

  const handleEventClick = (info: EventClickArg) => {
    const originalIndex = info.event.extendedProps.originalIndex;
    onToggleComplete(originalIndex);
  };

  const handleViewChange = (newView: "list" | "calendar") => {
    if (newView === "calendar" && !isPremium) {
      setShowPremiumModal(true);
    } else {
      setViewMode(newView);
    }
  };

  const openNotesModal = (index: number) => {
    setSelectedSlotIndex(index);
    setEditingNotes(schedule[index].notes || "");
    setIsPreviewMode(false);
  };

  const closeNotesModal = () => {
    setSelectedSlotIndex(null);
    setEditingNotes("");
    setIsPreviewMode(false);
  };

  const openViewNotesModal = (index: number) => {
    setViewNotesIndex(index);
  };

  const closeViewNotesModal = () => {
    setViewNotesIndex(null);
  };

  const saveNotes = async () => {
    if (selectedSlotIndex === null) return;

    const currentSlot = schedule[selectedSlotIndex];
    if (currentSlot.notes === editingNotes) {
      closeNotesModal();
      return;
    }

    const updatedSchedule = [...schedule];
    updatedSchedule[selectedSlotIndex] = { ...currentSlot, notes: editingNotes };
    setSchedule(updatedSchedule);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("User fetch error:", userError.message);
      toast.error(t("notesFailed"));
    } else if (user) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const { error } = await supabase
        .from("schedules")
        .upsert(
          { user_id: user.id, week_start: weekStartStr, schedule: updatedSchedule },
          { onConflict: "user_id,week_start" }
        );
      if (error) {
        console.error("Upsert error:", error.message);
        toast.error(t("notesFailed"));
      } else {
        toast.success(t("notesSaved"));
        closeNotesModal();
      }
    }
  };

  const preprocessMarkdown = (markdown: string): string => {
    if (!markdown) return markdown;

    const lines = markdown.split("\n");
    const processedLines: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const trimmedLine = currentLine.trim();
      const isListItem = /^\s*[-*+]\s+/.test(trimmedLine) || /^\s*\d+\.\s+/.test(trimmedLine);
      const isEmptyLine = trimmedLine === "";

      if (isListItem) {
        inList = true;
        processedLines.push(currentLine);
      } else if (inList && !isEmptyLine && trimmedLine) {
        processedLines.push("");
        processedLines.push(currentLine);
        inList = false;
      } else {
        processedLines.push(currentLine);
        inList = false;
      }
    }

    return processedLines.join("\n");
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mt-4 sm:mt-6 md:mt-10 w-full"
      >
        <div className="flex flex-col justify-between items-center mb-4 sm:mb-6 gap-4">
          <motion.h2
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-lg sm:text-xl md:text-2xl font-bold text-notion-text dark:text-notion-dark-text bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red"
          >
            {t("title")}
          </motion.h2>
          <div className="flex gap-2 sm:gap-3">
            {["list", "calendar"].map((mode) => (
              <motion.button
                key={mode}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => handleViewChange(mode as "list" | "calendar")}
                className={`px-2 py-1 sm:px-3 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 ${viewMode === mode
                    ? "bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white"
                    : "bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70"
                  }`}
              >
                {t(`${mode}View`)}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-4 sm:mb-6 bg-white dark:bg-notion-dark-card p-3 sm:p-4 rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center text-notion-text dark:text-notion-dark-text text-xs sm:text-sm gap-2 sm:gap-0">
            <span>{t("totalStudyHours", { hours: totalHours.toFixed(1) })}</span>
            <span>{t("completed", { percentage: Math.round(progress) })}</span>
            <span>{t("daysPlanned", { days: groupedSchedule.filter((g) => g.slots.length > 0).length })}</span>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-4 sm:mb-6"
        >
          <div className="w-full bg-notion-gray/30 dark:bg-notion-dark-gray/30 rounded-full h-2 sm:h-3 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "anticipate" }}
              className="bg-gradient-to-r from-notion-blue to-notion-dark-blue h-2 sm:h-3 rounded-full"
            />
          </div>
          <p className="text-xs text-notion-text/70 dark:text-notion-dark-secondary mt-1 sm:mt-2 text-center">
            {t("progress", { percentage: Math.round(progress) })}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {groupedSchedule.map(({ day, slots }, index) => (
                <motion.div
                  key={dayKeys[index]}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20 p-4 sm:p-6 hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-notion-text dark:text-notion-dark-text mb-3 sm:mb-4">
                    {day}
                  </h3>
                  {slots.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
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
                            key={`${dayKeys[index]}-${i}`}
                            variants={buttonVariants}
                            whileHover="hover"
                            className={`flex items-center justify-between p-2 sm:p-3 rounded-lg transition-all duration-300 ${slot.completed ? "opacity-60 bg-notion-gray/20 dark:bg-notion-dark-gray/20" : ""
                              }`}
                            style={{ backgroundColor: slot.completed ? undefined : slot.color }}
                            onClick={() => openViewNotesModal(globalIndex)}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={slot.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onToggleComplete(globalIndex);
                                }}
                                className="mr-2 sm:mr-3 text-notion-blue dark:text-notion-dark-blue focus:ring-notion-blue dark:focus:ring-notion-dark-blue w-4 h-4 sm:w-5 sm:h-5 cursor-pointer"
                              />
                              <span
                                className={`flex-1 font-medium text-xs sm:text-sm ${slot.color ? "text-[#333333]" : "text-notion-text dark:text-notion-dark-text"
                                  }`}
                              >
                                {slot.subject}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-notion-blue dark:text-notion-dark-blue text-xs font-medium">
                                {slot.start} – {slot.end}
                              </span>
                              <motion.button
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNotesModal(globalIndex);
                                }}
                                className="text-notion-blue dark:text-notion-dark-blue text-xs sm:text-sm"
                              >
                                <Edit2 size={15} />
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-notion-text/50 dark:text-notion-dark-secondary italic text-xs sm:text-sm">
                      {t("noSlots")}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white dark:bg-notion-dark-card p-2 sm:p-4 rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
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
                titleFormat={{ weekday: "short", day: "numeric", month: "short" }}
                allDaySlot={false}
                slotMinTime={slotMinTime}
                slotMaxTime={slotMaxTime}
                slotDuration="00:45:00"
                eventClick={handleEventClick}
                eventClassNames={(arg) => (arg.event.extendedProps.completed ? ["opacity-70"] : [])}
                height="auto"
                dayHeaderFormat={{ weekday: "short" }}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }}
                contentHeight="auto"
                themeSystem="standard"
                dayHeaderClassNames="text-notion-text dark:text-notion-dark-text bg-notion-bg dark:bg-notion-dark-bg border-notion-gray/30 dark:border-notion-dark-gray/30 text-xs sm:text-sm font-medium"
                slotLabelClassNames="text-notion-text/70 dark:text-notion-dark-secondary text-[10px] sm:text-xs"
                eventContent={(arg) => (
                  <div
                    className="flex items-center p-1 sm:p-2 h-full rounded-md shadow-sm border-l-4"
                    style={{
                      borderLeftColor: arg.event.extendedProps.completed ? "#4CAF50" : arg.event.borderColor,
                      backgroundColor: arg.event.backgroundColor + "CC",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className="font-semibold text-[11px] sm:text-sm block truncate"
                        style={{ color: arg.event.textColor }}
                      >
                        {arg.event.title}
                      </span>
                    </div>
                    <div className="ml-1 sm:ml-2 flex-shrink-0">
                      <span
                        className={`inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[8px] sm:text-[10px] font-bold ${arg.event.extendedProps.completed
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {arg.event.extendedProps.completed ? "✓" : "○"}
                      </span>
                    </div>
                  </div>
                )}
                slotLabelInterval="01:00:00"
                dayMaxEvents={3}
                moreLinkContent={({ num }) => `+${num} more`}
                moreLinkClassNames="text-xs text-notion-blue dark:text-notion-dark-blue"
                eventMinHeight={40}
                scrollTime={slotMinTime}
                eventOverlap={true}
                slotEventOverlap={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Notes Modal */}
        <AnimatePresence>
          {viewNotesIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white dark:bg-notion-dark-card p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-notion-text dark:text-notion-dark-text mb-4">
                  {t("viewNotes", {
                    subject: schedule[viewNotesIndex].subject,
                    start: schedule[viewNotesIndex].start,
                    end: schedule[viewNotesIndex].end,
                  })}
                </h3>
                <div className="text-notion-text dark:text-notion-dark-text text-sm mb-4 min-h-[100px] prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{preprocessMarkdown(schedule[viewNotesIndex].notes || t("noNotes"))}</ReactMarkdown>
                </div>
                <div className="flex justify-end">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeViewNotesModal}
                    className="px-4 py-2 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-lg hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-200 text-sm"
                  >
                    {t("close")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Notes Modal */}
        <AnimatePresence>
          {selectedSlotIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white dark:bg-notion-dark-card p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-notion-text dark:text-notion-dark-text mb-4">
                  {t("editNotes", {
                    subject: schedule[selectedSlotIndex].subject,
                    start: schedule[selectedSlotIndex].start,
                    end: schedule[selectedSlotIndex].end,
                  })}
                </h3>
                <div className="flex justify-end mb-2">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="px-3 py-1 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-lg hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-200 text-sm"
                  >
                    {isPreviewMode ? t("edit") : t("preview")}
                  </motion.button>
                </div>
                {isPreviewMode ? (
                  <div className="w-full p-3 bg-white dark:bg-notion-dark-card text-notion-text dark:text-notion-dark-text rounded-lg border border-notion-gray/20 dark:border-notion-dark-gray/20 min-h-[150px] prose dark:prose-invert max-w-none">
                    <ReactMarkdown>{preprocessMarkdown(editingNotes || t("noNotes"))}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder={t("notesPlaceholder")}
                    className="w-full p-3 bg-white dark:bg-notion-dark-card text-notion-text dark:text-notion-dark-text rounded-lg border border-notion-gray/20 dark:border-notion-dark-gray/20 focus:ring-2 focus:ring-notion-blue focus:border-transparent resize-y min-h-[150px] transition-all duration-200 shadow-inner font-medium"
                  />
                )}
                <div className="flex justify-end gap-2 mt-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={closeNotesModal}
                    className="px-4 py-2 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-lg hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-200 text-sm"
                  >
                    {t("cancel")}
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={saveNotes}
                    className="px-4 py-2 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-lg hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 text-sm"
                  >
                    {t("save")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Modal */}
        <AnimatePresence>
          {showPremiumModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white dark:bg-notion-dark-card p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
              >
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-notion-text dark:text-notion-dark-text mb-4">
                  {t("premiumModal.title")}
                </h2>
                <p className="text-notion-text dark:text-notion-dark-text mb-4 sm:mb-6 text-sm sm:text-base leading-relaxed">
                  {t("premiumModal.description")}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setShowPremiumModal(false)}
                    className="w-full sm:flex-1 py-2 sm:py-3 px-4 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-xl hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-200 text-sm sm:text-base"
                  >
                    {t("premiumModal.maybeLater")}
                  </motion.button>
                  <motion.a
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    href="/pricing"
                    className="w-full sm:flex-1 py-2 sm:py-3 px-4 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-xl text-center font-medium hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 shadow-md text-sm sm:text-base"
                  >
                    {t("premiumModal.goPremium")}
                  </motion.a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style jsx global>{`
        .fc-timegrid-col {
          min-width: 100px !important;
        }
        .fc-timegrid-event {
          min-width: 80px !important;
          margin: 2px 4px;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
        }
        .fc-timegrid-event .fc-event-main {
          padding: 0 !important;
        }
        .prose h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        .prose h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .prose h3 {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .prose ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose li {
          margin-bottom: 0.25rem;
        }
        .prose strong {
          font-weight: 700;
        }
        .prose em {
          font-style: italic;
        }
        .dark .prose-invert h1,
        .dark .prose-invert h2,
        .dark .prose-invert h3,
        .dark .prose-invert ul,
        .dark .prose-invert ol,
        .dark .prose-invert li,
        .dark .prose-invert strong,
        .dark .prose-invert em {
          color: #e5e7eb;
        }
      `}</style>
    </>
  );
}