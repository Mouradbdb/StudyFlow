"use client";

import { useState } from "react";
import ScheduleDisplay from "./ScheduleDisplay";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ScheduleSlot {
  day: string;
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
}

export default function StudyPlan({
  schedule,
  onToggleComplete,
  onClearSchedule,
  progress,
  isGenerating,
  isPremium,
}: {
  schedule: ScheduleSlot[];
  onToggleComplete: (index: number) => void;
  onClearSchedule: () => void;
  progress: number;
  isGenerating: boolean;
  isPremium: boolean;
}) {
  const t = useTranslations("StudyPlan"); // Access "StudyPlan" namespace
  const tToasts = useTranslations("StudyPlan.toasts"); // For toast messages
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const exportToCSV = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      setIsExportOpen(false);
      return;
    }
    if (schedule.length === 0) {
      toast.error(tToasts("noSchedule"));
      return;
    }

    const headers = ["Day", "Start", "End", "Subject", "Completed", "Color"];
    const rows = schedule.map((slot) => [
      slot.day,
      slot.start,
      slot.end,
      slot.subject,
      slot.completed ? "Yes" : "No",
      slot.color || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => `"${value}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "study_plan.csv";
    link.click();
    toast.success(tToasts("exportCSVSuccess"));
  };

  const exportToPDF = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      setIsExportOpen(false);
      return;
    }
    if (schedule.length === 0) {
      toast.error(tToasts("noSchedule"));
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t("title"), 10, 10);

    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const sortedSchedule = [...schedule].sort((a, b) => {
      const dayA = dayOrder.indexOf(a.day);
      const dayB = dayOrder.indexOf(b.day);
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });

    const headers = ["Day", "Start", "End", "Subject", "Completed"];
    const rows = sortedSchedule.map((slot) => [
      slot.day,
      slot.start,
      slot.end,
      slot.subject,
      slot.completed ? "Yes" : "No",
    ]);

    autoTable(doc, {
      startY: 20,
      head: [headers],
      body: rows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      didParseCell: (data) => {
        const slot = sortedSchedule[data.row.index];
        if (slot && slot.color && data.column.index === 3) {
          const hex = slot.color.replace("#", "");
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          data.cell.styles.textColor = [r, g, b];
        }
      },
    });

    doc.save("study_plan.pdf");
    toast.success(tToasts("exportPDFSuccess"));
  };

  const exportToICS = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      setIsExportOpen(false);
      return;
    }
    if (schedule.length === 0) {
      toast.error(tToasts("noSchedule"));
      return;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-////StudyPlan//EN",
      "CALSCALE:GREGORIAN",
    ];

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    schedule.forEach((slot) => {
      const dayIndex = days.indexOf(slot.day);
      if (dayIndex === -1) return;

      const eventDate = new Date(weekStart);
      eventDate.setDate(eventDate.getDate() + dayIndex);

      const [startHour, startMinute] = slot.start.split(":").map(Number);
      const [endHour, endMinute] = slot.end.split(":").map(Number);
      eventDate.setHours(startHour, startMinute, 0, 0);

      const startTime = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const endDate = new Date(eventDate);
      endDate.setHours(endHour, endMinute, 0, 0);
      const endTime = endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      icsLines.push(
        "BEGIN:VEVENT",
        `UID:${startTime}-${slot.subject}@studyflow`,
        `DTSTART:${startTime}`,
        `DTEND:${endTime}`,
        `SUMMARY:${slot.subject}`,
        `DESCRIPTION:Completed: ${slot.completed ? "Yes" : "No"}`,
        "END:VEVENT"
      );
    });

    icsLines.push("END:VCALENDAR");
    const icsContent = icsLines.join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "study_plan.ics";
    link.click();
    toast.success(tToasts("exportICSSuccess"));
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-notion-dark-card p-4 sm:p-6 rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20 transition-all duration-300 hover:shadow-lg w-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-4">
        <motion.h2
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="text-lg sm:text-xl font-bold text-notion-text dark:text-notion-dark-text bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red"
        >
          {t("title")}
        </motion.h2>
        <div className="relative w-full sm:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-notion-green to-notion-dark-green text-white rounded-xl shadow-md hover:from-notion-green/90 hover:to-notion-dark-green/90 transition-all duration-300 text-sm sm:text-base"
          >
            {t("export")}
          </motion.button>
          <AnimatePresence>
            {isExportOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 sm:right-0 mt-2 w-full sm:w-48 bg-white dark:bg-notion-dark-card rounded-xl shadow-xl border border-notion-gray/20 dark:border-notion-dark-gray/20 z-10"
              >
                {["CSV", "PDF", "ICS"].map((format) => (
                  <motion.button
                    key={format}
                    whileHover={{ backgroundColor: "rgba(229, 231, 235, 0.2)" }}
                    onClick={() => {
                      if (format === "CSV") exportToCSV();
                      else if (format === "PDF") exportToPDF();
                      else exportToICS();
                      setIsExportOpen(false);
                    }}
                    className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20 transition-colors duration-200"
                  >
                    {t("exportTo", { format })}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6 sm:py-8"
          >
            <p className="text-base sm:text-lg font-medium text-notion-text dark:text-notion-dark-text mb-4 sm:mb-6">
              {t("generating")}
            </p>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-notion-blue dark:border-notion-dark-blue border-t-transparent rounded-full"
            />
          </motion.div>
        ) : schedule.length > 0 ? (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ScheduleDisplay
              schedule={schedule}
              onToggleComplete={onToggleComplete}
              progress={progress}
              isPremium={isPremium}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClearSchedule}
              className="mt-4 sm:mt-6 w-full px-4 py-2 sm:py-3 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-xl hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70 transition-all duration-300 shadow-md text-sm sm:text-base"
            >
              {t("clearSchedule")}
            </motion.button>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-notion-text/70 dark:text-notion-dark-secondary text-center py-6 sm:py-8 text-sm sm:text-base"
          >
            {t("noPlan")}
          </motion.p>
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
              className="bg-white dark:bg-notion-dark-card p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-notion-gray/20 dark:border-notion-dark-gray/20 text-center"
            >
              <h2 className="text-lg sm:text-xl font-bold text-notion-text dark:text-notion-dark-text mb-4">
                {t("premiumModal.title")}
              </h2>
              <p className="text-notion-text dark:text-notion-dark-text mb-4 sm:mb-6 text-sm sm:text-base">
                {t("premiumModal.description")}
              </p>
              <div className="flex justify-center gap-2 sm:gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowPremiumModal(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-notion-gray/10 hover:bg-notion-gray/20 dark:bg-notion-dark-gray/10 dark:hover:bg-notion-dark-gray/20 transition-all duration-200 text-sm sm:text-base"
                >
                  {t("premiumModal.cancel")}
                </motion.button>
                <Link href="/pricing">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 text-sm sm:text-base"
                  >
                    {t("premiumModal.upgrade")}
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}