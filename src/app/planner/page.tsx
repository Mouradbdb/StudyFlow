"use client";

import { useState, useEffect } from "react";
import StudyForm from "../components/StudyForm";
import ScheduleDisplay from "../components/ScheduleDisplay";
import { generateSchedule, ScheduleSlot } from "../utils/scheduler";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

export default function Planner() {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastFormData, setLastFormData] = useState<{
    subjects: { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }[];
    freeTimes: { day: string; start: string; end: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<{
    subjects: { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }[];
    freeTimes: { day: string; start: string; end: string }[];
  } | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();

  const getWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError.message);
        return;
      }
      setIsSignedIn(!!session);
      if (session) {
        const weekStart = getWeekStart();
        const { data, error } = await supabase
          .from("schedules")
          .select("schedule")
          .eq("user_id", session.user.id)
          .eq("week_start", weekStart)
          .limit(1);
        if (error) {
          console.error("Fetch schedule error:", error.message);
          toast.error("Failed to load this week's schedule.");
        } else if (data && data.length > 0) {
          setSchedule(data[0].schedule);
        } else {
          setSchedule([]);
          setLastFormData(null);
          toast.info("New week started! Please enter your study plan.");
        }
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsSignedIn(!!session);
      if (event === "SIGNED_IN" && session) {
        await checkSession();
      } else if (event === "SIGNED_OUT") {
        setSchedule([]);
        setLastFormData(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const calculateProgress = (currentSchedule: ScheduleSlot[]) => {
    const subjectSlots = currentSchedule.filter((slot) => slot.subject !== "Break");
    if (subjectSlots.length === 0) return 0;
    const totalSlots = subjectSlots.length;
    const completedSlots = subjectSlots.filter((slot) => slot.completed).length;
    return (completedSlots / totalSlots) * 100;
  };

  const handleFormSubmit = async (
    subjects: { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }[],
    freeTimes: { day: string; start: string; end: string }[],
    breakDuration: number,
    slotDuration: number,
    maxDailyHours: number
  ) => {
    setIsGenerating(true);
    setError(null);
    setWarning(null);
    setLastFormData({ subjects, freeTimes });

    const randomDelay = Math.floor(Math.random() * 4000) + 1000;
    setTimeout(async () => {
      try {
        const originalWarn = console.warn;
        let warningMessage: string | null = null;
        console.warn = (...args: any[]) => {
          warningMessage = args.join(" ");
          originalWarn(...args);
        };

        const generatedSchedule = generateSchedule(subjects, freeTimes, breakDuration, slotDuration, maxDailyHours);
        setSchedule(generatedSchedule);

        if (isSignedIn) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (user) {
            const weekStart = getWeekStart();
            const { error: upsertError } = await supabase
              .from("schedules")
              .upsert(
                { user_id: user.id, week_start: weekStart, schedule: generatedSchedule },
                { onConflict: "user_id,week_start" }
              );
            if (upsertError) {
              console.error("Upsert schedule error:", upsertError.message);
              toast.error("Failed to save study plan.");
              throw upsertError;
            }
            toast.success("Study plan saved for this week!");
          }
        } else {
          toast.info("Sign in to save your study plan!");
        }

        console.warn = originalWarn;
        if (warningMessage) setWarning(warningMessage);
        toast.success("Study plan generated successfully!");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred while generating the schedule.");
      } finally {
        setIsGenerating(false);
      }
    }, randomDelay);
  };

  const saveTemplate = () => {
    if (!lastFormData) {
      toast.error("Generate a plan first to save a template!");
      return;
    }
    if (!isSignedIn) {
      toast.error("Sign in to save templates!");
      return;
    }
    setSavedTemplate({ subjects: lastFormData.subjects, freeTimes: lastFormData.freeTimes });
    toast.success("Template saved successfully!");
  };

  const loadTemplate = () => {
    if (!isSignedIn) {
      toast.error("Sign in to load templates!");
      return null;
    }
    if (!savedTemplate) {
      toast.error("No template saved yet!");
      return null;
    }
    return savedTemplate;
  };

  const clearSchedule = async () => {
    setSchedule([]);
    setLastFormData(null);
    setError(null);
    setWarning(null);
    if (isSignedIn) {
      setSavedTemplate(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("User fetch error:", userError.message);
      } else if (user) {
        const weekStart = getWeekStart();
        const { error: deleteError } = await supabase
          .from("schedules")
          .delete()
          .eq("user_id", user.id)
          .eq("week_start", weekStart);
        if (deleteError) {
          console.error("Delete error:", deleteError.message);
          toast.error("Failed to clear schedule.");
        }
      }
    }
    toast.success("Schedule cleared!");
  };

  const toggleComplete = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].completed = !newSchedule[index].completed;
    setSchedule(newSchedule);
    if (isSignedIn) {
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error) {
          console.error("User fetch error:", error.message);
        } else if (user) {
          const weekStart = getWeekStart();
          supabase
            .from("schedules")
            .upsert(
              { user_id: user.id, week_start: weekStart, schedule: newSchedule },
              { onConflict: "user_id,week_start" }
            )
            .then(({ error }) => {
              if (error) {
                console.error("Upsert error:", error.message);
                toast.error("Failed to update schedule.");
              }
            });
        }
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully!");
    router.push("/sign-in");
  };

  const progress = calculateProgress(schedule);
  const generateButtonText = schedule.length > 0 && !isGenerating ? "Regenerate Study Plan" : "Generate Study Plan";

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 bg-notion-bg dark:bg-notion-dark-bg min-h-screen transition-colors duration-300">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-notion-text dark:text-notion-dark-text">StudyFlow</h1>
        {isSignedIn ? (
          <button
            onClick={handleSignOut}
            className="text-sm sm:text-base text-notion-blue dark:text-notion-dark-blue hover:underline"
          >
            Sign Out
          </button>
        ) : (
          <a href="/sign-in" className="text-sm sm:text-base text-notion-blue dark:text-notion-dark-blue hover:underline">
            Sign In
          </a>
        )}
      </div>
      <StudyForm onSubmit={handleFormSubmit} onLoadTemplate={loadTemplate} />
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-lg flex flex-col items-center">
            <p className="text-base sm:text-lg text-notion-text dark:text-notion-dark-text mb-4">Generating your study plan...</p>
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-notion-blue dark:border-notion-dark-blue border-t-transparent dark:border-t-notion-dark-bg rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      {error && !isGenerating && (
        <div className="mt-4 p-4 bg-notion-red/20 dark:bg-notion-dark-red/20 text-notion-red dark:text-notion-dark-red rounded-lg">
          <p className="text-sm sm:text-base">Error: {error}</p>
        </div>
      )}
      {warning && !isGenerating && schedule.length > 0 && (
        <div className="mt-4 p-4 bg-notion-yellow/20 dark:bg-notion-dark-yellow/20 text-notion-yellow dark:text-notion-dark-yellow rounded-lg">
          <p className="text-sm sm:text-base">Warning: {warning}</p>
        </div>
      )}
      {schedule.length > 0 && !isGenerating && (
        <>
          <ScheduleDisplay schedule={schedule} onToggleComplete={toggleComplete} progress={progress} />
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={saveTemplate}
              className="w-full sm:flex-1 bg-notion-yellow dark:bg-notion-dark-yellow text-notion-text dark:text-notion-dark-text py-3 rounded-lg hover:bg-notion-yellow/90 dark:hover:bg-notion-dark-yellow/90 hover:shadow-md transition-all duration-300 font-semibold text-sm sm:text-base"
            >
              Save as Template
            </button>
            <button
              onClick={clearSchedule}
              className="w-full sm:flex-1 bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text py-3 rounded-lg hover:bg-notion-gray/90 dark:hover:bg-notion-dark-gray/90 hover:shadow-md transition-all duration-300 font-semibold text-sm sm:text-base"
            >
              Clear Schedule
            </button>
          </div>
        </>
      )}
    </main>
  );
}