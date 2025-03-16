"use client";

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface Subject { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }
interface FreeTime { day: string; start: string; end: string }
interface Template { id: string; name: string; data: { subjects: Subject[]; freeTimes: FreeTime[] } }

export default function StudyForm({
  subjects,
  setSubjects,
  freeTimes,
  setFreeTimes,
  breakDuration,
  setBreakDuration,
  slotDuration,
  setSlotDuration,
  maxDailyHours,
  setMaxDailyHours,
  onSubmit,
  templates,
  fetchTemplates,
}: {
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  freeTimes: FreeTime[];
  setFreeTimes: (freeTimes: FreeTime[]) => void;
  breakDuration: number;
  setBreakDuration: (value: number) => void;
  slotDuration: number;
  setSlotDuration: (value: number) => void;
  maxDailyHours: number;
  setMaxDailyHours: (value: number) => void;
  onSubmit: (
    subjects: Subject[],
    freeTimes: FreeTime[],
    breakDuration: number,
    slotDuration: number,
    maxDailyHours: number
  ) => void;
  templates: Template[];
  fetchTemplates: () => Promise<void>;
}) {
  const t = useTranslations("StudyForm");
  const tToasts = useTranslations("StudyForm.toasts");
  const [subjectName, setSubjectName] = useState("");
  const [hours, setHours] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [color, setColor] = useState("");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const predefinedColors = [
    "#F28B82", "#FBCB9C", "#FFE082", "#CCFF90", "#A7FFEB",
    "#80DEEA", "#82B1FF", "#B388FF", "#F8BBD0",
  ];

  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ].map((d) => ({ value: d, label: t(`days.${d}`) }));

  const addSubject = () => {
    const hoursNum = parseInt(hours);
    if (!subjectName || !hours || hoursNum <= 0) {
      toast.error(tToasts("invalidSubject"));
      return;
    }
    setSubjects([...subjects, { name: subjectName, hours: hoursNum, priority, color: color || undefined }]);
    setSubjectName("");
    setHours("");
    setColor("");
  };

  const addFreeTime = () => {
    if (!day || !start || !end) {
      toast.error(tToasts("invalidFreeTime"));
      return;
    }
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    if (startH > endH || (startH === endH && startM >= endM)) {
      toast.error(tToasts("invalidTimeRange"));
      return;
    }
    setFreeTimes([...freeTimes, { day, start, end }]);
    setDay("");
    setStart("");
    setEnd("");
  };

  const handleSubmit = () => {
    if (subjects.length === 0 || freeTimes.length === 0) {
      toast.error(tToasts("insufficientData"));
      return;
    }
    const totalStudyHours = subjects.reduce((sum, s) => sum + s.hours, 0);
    const totalFreeHours = freeTimes.reduce((sum, ft) => {
      const [startH, startM] = ft.start.split(":").map(Number);
      const [endH, endM] = ft.end.split(":").map(Number);
      return sum + (endH + endM / 60 - (startH + startM / 60));
    }, 0);

    if (totalFreeHours < totalStudyHours) {
      toast.error(tToasts("insufficientFreeTime"));
      return;
    }
    onSubmit(subjects, freeTimes, breakDuration, slotDuration, maxDailyHours);
  };

  const handleSaveTemplate = async () => {
    if (!subjects.length || !freeTimes.length) {
      toast.error(tToasts("emptyTemplate"));
      return;
    }
    if (!newTemplateName.trim()) {
      toast.error(tToasts("noTemplateName"));
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("User fetch error:", userError.message);
      toast.error(tToasts("fetchUserFailed"));
      return;
    }

    const templateData = { subjects, freeTimes };
    const { error } = await supabase
      .from("templates")
      .insert({ user_id: user!.id, name: newTemplateName.trim(), data: templateData });

    if (error) {
      if (error.code === "23505") {
        toast.error(tToasts("templateExists"));
      } else {
        console.error("Save template error:", error.message);
        toast.error(tToasts("saveTemplateFailed"));
      }
    } else {
      toast.success(tToasts("saveTemplateSuccess", { name: newTemplateName }));
      setNewTemplateName("");
      setIsSaveModalOpen(false);
      await fetchTemplates();
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      toast.error(tToasts("loadTemplateFailed"));
      return;
    }
    setSubjects(template.data.subjects);
    setFreeTimes(template.data.freeTimes);
    toast.success(tToasts("loadTemplateSuccess", { name: template.name }));
    setIsLoadModalOpen(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (!confirm(tToasts("confirmDelete", { name: template.name }))) return;

    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      console.error("Delete template error:", error.message);
      toast.error(tToasts("deleteTemplateFailed"));
    } else {
      toast.success(tToasts("deleteTemplateSuccess", { name: template.name }));
      await fetchTemplates();
    }
  };

  return (
    <div className="space-y-8">
      {/* Subjects Section */}
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">{t("subjectsTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,auto,auto,auto,auto] items-center">
          <input
            type="text"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder={t("subjectPlaceholder")}
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          />
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder={t("hoursPlaceholder")}
            min="1"
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")}
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          >
            <option value="High">{t("priorityHigh")}</option>
            <option value="Medium">{t("priorityMedium")}</option>
            <option value="Low">{t("priorityLow")}</option>
          </select>
          <div className="flex flex-wrap gap-2 items-center">
            {predefinedColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-notion-blue" : "border-notion-gray"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={addSubject}
            className="bg-notion-blue dark:bg-notion-dark-blue text-white py-2 px-4 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300"
          >
            {t("add")}
          </button>
        </div>
        {subjects.length > 0 && (
          <ul className="mt-4 space-y-2">
            {subjects.map((s, i) => (
              <li key={i} className="flex justify-between items-center p-3 bg-notion-bg dark:bg-notion-dark-bg rounded-lg transition-colors duration-300">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: s.color || "transparent" }}></span>
                  <span className="text-notion-text dark:text-notion-dark-text">{s.name} ({t(`priority${s.priority}`)})</span>
                </div>
                <span className="text-notion-text/70 dark:text-notion-dark-secondary">{s.hours} hrs</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Free Time Section */}
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">{t("freeTimeTitle")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr,1fr,1fr,auto] items-center">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          >
            <option value="">{t("dayPlaceholder")}</option>
            {days.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
          />
          <button
            onClick={addFreeTime}
            className="bg-notion-blue dark:bg-notion-dark-blue text-white py-2 px-4 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300"
          >
            {t("add")}
          </button>
        </div>
        {freeTimes.length > 0 && (
          <ul className="mt-4 space-y-2">
            {freeTimes.map((ft, i) => (
              <li key={i} className="flex justify-between items-center p-3 bg-notion-bg dark:bg-notion-dark-bg rounded-lg transition-colors duration-300">
                <span className="text-notion-text dark:text-notion-dark-text">{t(`days.${ft.day}`)}</span>
                <span className="text-notion-text/70 dark:text-notion-dark-secondary">{ft.start} - {ft.end}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Settings Section */}
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md border border-notion-gray dark:border-notion-dark-gray transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-notion-text dark:text-notion-dark-text">{t("settingsTitle")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">{t("breakDurationLabel")}</label>
            <input
              type="number"
              value={breakDuration}
              onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)}
              className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
              min="5"
              max="60"
              step="5"
              placeholder="e.g., 15"
            />
          </div>
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">{t("slotDurationLabel")}</label>
            <input
              type="number"
              value={slotDuration}
              onChange={(e) => setSlotDuration(parseInt(e.target.value) || 0)}
              className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
              min="30"
              max="240"
              step="15"
              placeholder="e.g., 120"
            />
          </div>
          <div>
            <label className="block mb-2 text-notion-text dark:text-notion-dark-text">{t("maxDailyHoursLabel")}</label>
            <input
              type="number"
              value={maxDailyHours}
              onChange={(e) => setMaxDailyHours(parseInt(e.target.value) || 0)}
              className="p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg w-24 focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-colors duration-300"
              min="1"
              max="24"
              step="1"
              placeholder="e.g., 8"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-notion-red dark:bg-notion-dark-red text-white py-3 rounded-lg hover:bg-notion-red/90 dark:hover:bg-notion-dark-red/90 hover:shadow-md transition-all duration-300 font-semibold"
        >
          {subjects.length > 0 && freeTimes.length > 0 ? t("regenerateStudyPlan") : t("generateStudyPlan")}
        </button>
        <button
          onClick={() => setIsSaveModalOpen(true)}
          className="flex-1 bg-notion-yellow dark:bg-notion-dark-yellow text-notion-text dark:text-notion-dark-text py-3 rounded-lg hover:bg-notion-yellow/90 dark:hover:bg-notion-dark-yellow/90 hover:shadow-md transition-all duration-300 font-semibold"
        >
          {t("saveAsTemplate")}
        </button>
        <button
          onClick={() => setIsLoadModalOpen(true)}
          className="flex-1 bg-notion-blue dark:bg-notion-dark-blue text-white py-3 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300 font-semibold"
        >
          {t("loadTemplate")}
        </button>
      </div>

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-notion-dark-card rounded-xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-notion-text dark:text-notion-dark-text">{t("saveTemplateTitle")}</h2>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-notion-text dark:text-notion-dark-text hover:text-notion-red dark:hover:text-notion-dark-red"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={t("templateNamePlaceholder")}
                className="w-full p-2 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg text-notion-text dark:text-notion-dark-text focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue"
              />
            </div>
            <button
              onClick={handleSaveTemplate}
              className="w-full px-4 py-2 bg-notion-green dark:bg-notion-dark-green text-white rounded-lg hover:bg-notion-green/90 dark:hover:bg-notion-dark-green/90 transition-colors duration-300"
            >
              {t("save")}
            </button>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-notion-dark-card rounded-xl p-6 w-full max-w-md shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-notion-text dark:text-notion-dark-text">{t("loadTemplateTitle")}</h2>
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="text-notion-text dark:text-notion-dark-text hover:text-notion-red dark:hover:text-notion-dark-red"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {templates.length > 0 ? (
                templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-2 border-b border-notion-gray/20 dark:border-notion-dark-gray/20">
                    <span className="text-notion-text dark:text-notion-dark-text">{template.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadTemplate(template.id)}
                        className="p-1 text-notion-blue dark:text-notion-dark-blue hover:text-notion-blue/80 dark:hover:text-notion-dark-blue/80"
                      >
                        {t("load")}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-notion-red dark:text-notion-dark-red hover:text-notion-red/80 dark:hover:text-notion-dark-red/80"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-notion-text/70 dark:text-notion-dark-secondary text-center">{t("noTemplates")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}