"use client";

import { useState } from "react";
import ScheduleDisplay from "./ScheduleDisplay";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ScheduleSlot { day: string; start: string; end: string; subject: string; completed: boolean; color?: string }

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
  const [isExportOpen, setIsExportOpen] = useState(false);

  const exportToCSV = () => {
    if (!isPremium) {
      toast.error("Export feature is available only to premium users!");
      return;
    }
    if (schedule.length === 0) {
      toast.error("No schedule to export!");
      return;
    }

    const headers = ["Day", "Start", "End", "Subject", "Completed", "Color"];
    const rows = schedule.map(slot => [
      slot.day,
      slot.start,
      slot.end,
      slot.subject,
      slot.completed ? "Yes" : "No",
      slot.color || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(value => `"${value}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "study_plan.csv";
    link.click();
    toast.success("Schedule exported as CSV!");
  };

  const exportToPDF = () => {
    if (!isPremium) {
      toast.error("Export feature is available only to premium users!");
      return;
    }
    if (schedule.length === 0) {
      toast.error("No schedule to export!");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Study Plan", 10, 10);

    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const sortedSchedule = [...schedule].sort((a, b) => {
      const dayA = dayOrder.indexOf(a.day);
      const dayB = dayOrder.indexOf(b.day);
      if (dayA !== dayB) return dayA - dayB;
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });

    const headers = ["Day", "Start", "End", "Subject", "Completed"];
    const rows = sortedSchedule.map(slot => [
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
    toast.success("Schedule exported as PDF!");
  };

  const exportToICS = () => {
    if (!isPremium) {
      toast.error("Export feature is available only to premium users!");
      return;
    }
    if (schedule.length === 0) {
      toast.error("No schedule to export!");
      return;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//StudyFlow//StudyPlan//EN",
      "CALSCALE:GREGORIAN",
    ];

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    schedule.forEach(slot => {
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
    toast.success("Schedule exported as ICS!");
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  return (
    <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-notion-text dark:text-notion-dark-text">Study Plan</h2>
        {isPremium && (
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-notion-green dark:bg-notion-dark-green text-white rounded-lg hover:bg-notion-green/90 dark:hover:bg-notion-dark-green/90 transition-colors duration-300"
            >
              Export
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-notion-dark-card border border-notion-gray dark:border-notion-dark-gray rounded-lg shadow-lg z-10">
                <button
                  onClick={() => { exportToCSV(); setIsExportOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20"
                >
                  Export to CSV
                </button>
                <button
                  onClick={() => { exportToPDF(); setIsExportOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20"
                >
                  Export to PDF
                </button>
                <button
                  onClick={() => { exportToICS(); setIsExportOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20"
                >
                  Export to ICS
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {isGenerating ? (
        <div className="flex flex-col items-center">
          <p className="text-lg text-notion-text dark:text-notion-dark-text mb-4">Generating your study plan...</p>
          <div className="w-12 h-12 border-4 border-notion-blue dark:border-notion-dark-blue border-t-transparent dark:border-t-notion-dark-bg rounded-full animate-spin"></div>
        </div>
      ) : schedule.length > 0 ? (
        <>
          {isPremium ? (
            <ScheduleDisplay schedule={schedule} onToggleComplete={onToggleComplete} progress={progress} />
          ) : (
            <p className="text-notion-text/70 dark:text-notion-dark-secondary text-center">
              Calendar view is available only to premium users.
            </p>
          )}
          <button
            onClick={onClearSchedule}
            className="mt-6 w-full px-4 py-2 bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text rounded-lg hover:bg-notion-gray/90 dark:hover:bg-notion-dark-gray/90 transition-colors duration-300"
          >
            Clear Schedule
          </button>
        </>
      ) : (
        <p className="text-notion-text/70 dark:text-notion-dark-secondary text-center">No study plan generated yet. Go to Plan Setup to create one.</p>
      )}
    </div>
  );
}