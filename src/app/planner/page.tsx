"use client";

import { useState, useEffect } from "react";
import StudyForm from "../components/StudyForm";
import StudyPlan from "../components/StudyPlan";
import { generateSchedule, ScheduleSlot } from "../utils/scheduler";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

interface Subject { name: string; hours: number; priority: "High" | "Medium" | "Low"; color?: string }
interface FreeTime { day: string; start: string; end: string }
interface Template { id: string; name: string; data: { subjects: Subject[]; freeTimes: FreeTime[] } }

export default function Planner() {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [activeView, setActiveView] = useState<"planSetup" | "studyPlan">("planSetup");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>([]);
  const [breakDuration, setBreakDuration] = useState(15);
  const [slotDuration, setSlotDuration] = useState(120);
  const [maxDailyHours, setMaxDailyHours] = useState(8);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error.message);
        return;
      }
      setIsSignedIn(!!session);
      if (session) {
        await fetchSchedule(session.user.id, getWeekStart());
        await fetchTemplates(session.user.id);

        // Check payment success and verify
        const success = searchParams.get("success");
        const orderId = searchParams.get("token");
        if (success === "true" && orderId) {
          console.log("Verifying payment for orderId:", orderId);
          const res = await fetch("/api/verify_payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, userId: session.user.id }),
          });

          if (res.ok) {
            const { success } = await res.json();
            if (success) {
              const { error: updateError } = await supabase
                .from("users")
                .update({ is_premium: true, paypal_payment_id: orderId })
                .eq("id", session.user.id);
              if (updateError) {
                console.error("Error updating user to premium:", updateError.message);
                toast.error("Failed to update premium status.");
              } else {
                console.log("Payment verified, user updated to premium");
                toast.success("Payment successful! You are now a premium user.");
                setIsPremium(true);
                router.replace("/planner"); // Clear query params
              }
            }
          } else {
            const { error } = await res.json();
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed: " + error);
          }
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", session.user.id)
          .limit(1);

        if (userError) {
          console.error("Error fetching user premium status:", userError.message);
          toast.error("Error checking user status: " + userError.message);
        } else if (userData && userData.length > 0) {
          setIsPremium(userData[0].is_premium || false);
        } else {
          toast.error("User data not found. Please try signing out and back in.");
        }
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsSignedIn(!!session);
      if (event === "SIGNED_IN" && session) {
        await fetchSchedule(session.user.id, getWeekStart());
        await fetchTemplates(session.user.id);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", session.user.id)
          .limit(1);

        if (userError) {
          console.error("Error fetching user premium status on auth change:", userError.message);
          toast.error("Error checking user status: " + userError.message);
        } else if (userData && userData.length > 0) {
          setIsPremium(userData[0].is_premium || false);
        } else {
          toast.error("User data not found. Please try signing out and back in.");
        }
      } else if (event === "SIGNED_OUT") {
        setSchedule([]);
        setSavedTemplates([]);
        setIsPremium(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const getWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  const fetchSchedule = async (userId: string, weekStart: string) => {
    const { data, error } = await supabase
      .from("schedules")
      .select("schedule")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .limit(1);
    if (error) {
      console.error("Fetch schedule error:", error.message);
      toast.error("Failed to load this week's schedule.");
    } else if (data && data.length > 0) {
      setSchedule(data[0].schedule);
      toast.success("Loaded your saved study plan!");
    } else {
      setSchedule([]);
      toast.info("New week started! Enter your study plan or load a template.");
    }
  };

  const fetchTemplates = async (userId: string) => {
    const { data, error } = await supabase
      .from("templates")
      .select("id, name, data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch templates error:", error.message);
      toast.error("Failed to load templates.");
    } else {
      setSavedTemplates(data || []);
    }
  };

  const calculateProgress = (currentSchedule: ScheduleSlot[]) => {
    const subjectSlots = currentSchedule.filter((slot) => slot.subject !== "Break");
    if (subjectSlots.length === 0) return 0;
    const totalSlots = subjectSlots.length;
    const completedSlots = subjectSlots.filter((slot) => slot.completed).length;
    return (completedSlots / totalSlots) * 100;
  };

  const handleFormSubmit = async (
    subjects: Subject[],
    freeTimes: FreeTime[],
    breakDuration: number,
    slotDuration: number,
    maxDailyHours: number
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to generate a plan!");
      return;
    }

    if (!isPremium) {
      const { data: userData, error } = await supabase
        .from("users")
        .select("last_plan_generated")
        .eq("id", user.id)
        .limit(1);
      if (error) {
        console.error("Error checking last plan:", error.message || error);
        toast.error("Error checking plan limit: " + error.message);
        return;
      }

      const lastGenerated = userData?.[0]?.last_plan_generated
        ? new Date(userData[0].last_plan_generated)
        : null;
      const now = new Date();
      const weekStart = new Date(getWeekStart());
      if (lastGenerated && lastGenerated >= weekStart && lastGenerated <= now) {
        toast.error("Non-premium users can only generate one plan per week!");
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    setWarning(null);

    const randomDelay = Math.floor(Math.random() * 1000) + 500;
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
            if (!isPremium) {
              const { error: updateError } = await supabase
                .from("users")
                .update({ last_plan_generated: new Date().toISOString() })
                .eq("id", user.id);
              if (updateError) {
                console.error("Error updating last plan generated:", updateError.message);
                toast.error("Failed to update plan generation time.");
                throw updateError;
              }
            }
            toast.success("Study plan saved!");
          }
        } else {
          toast.info("Sign in to save your study plan!");
        }

        console.warn = originalWarn;
        if (warningMessage) setWarning(warningMessage);
        toast.success("Study plan generated!");
        if (activeView !== "studyPlan") {
          setActiveView("studyPlan");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while generating the schedule.");
      } finally {
        setIsGenerating(false);
      }
    }, randomDelay);
  };

  const clearSchedule = async () => {
    setSchedule([]);
    setError(null);
    setWarning(null);
    if (isSignedIn) {
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
    console.log("Initiating sign out...");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
        toast.error("Failed to sign out: " + error.message);
        return;
      }
      console.log("Sign out successful");
      toast.success("Signed out successfully!");
      router.push("/sign-in");
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      toast.error("Error signing out: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const fetchTemplatesAsync = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchTemplates(user.id);
    }
  };

  const handleUpgrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user signed in for upgrade");
      toast.error("Please sign in to upgrade!");
      return;
    }

    console.log("Initiating upgrade for userId:", user.id);
    toast.info("Redirecting to PayPal...");

    try {
      const res = await fetch("/api/paypal_payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      console.log("PayPal API response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("PayPal payment API error:", errorData);
        toast.error("Failed to initiate payment: " + (errorData.error || "Unknown error"));
        return;
      }

      const { approval_url } = await res.json();
      if (!approval_url) {
        console.error("No approval URL returned from API:", await res.text());
        toast.error("Payment setup failed: No approval URL");
        return;
      }

      console.log("Redirecting to PayPal with URL:", approval_url);
      window.location.href = approval_url;
    } catch (error) {
      console.error("Error in handleUpgrade:", error);
      toast.error("Error upgrading plan: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const progress = calculateProgress(schedule);

  return (
    <main className="max-w-5xl mx-auto p-6 bg-notion-bg dark:bg-notion-dark-bg min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-notion-text dark:text-notion-dark-text">Planner</h1>
        <div className="flex gap-4">
          {!isPremium && (
            <button
              onClick={handleUpgrade}
              className="text-sm text-notion-green dark:text-notion-dark-green hover:underline"
            >
              Upgrade to Premium
            </button>
          )}
          {isSignedIn ? (
            <button
              onClick={handleSignOut}
              className="text-sm text-notion-blue dark:text-notion-dark-blue hover:underline"
            >
              Sign Out
            </button>
          ) : (
            <a href="/sign-in" className="text-sm text-notion-blue dark:text-notion-dark-blue hover:underline">
              Sign In
            </a>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveView("planSetup")}
          className={`px-4 py-2 rounded-lg font-semibold ${activeView === "planSetup" ? "bg-notion-blue text-white" : "bg-notion-gray text-notion-text dark:bg-notion-dark-gray dark:text-notion-dark-text hover:bg-notion-gray/90 dark:hover:bg-notion-dark-gray/90"} transition-all duration-300`}
        >
          Plan Setup
        </button>
        <button
          onClick={() => setActiveView("studyPlan")}
          className={`px-4 py-2 rounded-lg font-semibold ${activeView === "studyPlan" ? "bg-notion-blue text-white" : "bg-notion-gray text-notion-text dark:bg-notion-dark-gray dark:text-notion-dark-text hover:bg-notion-gray/90 dark:hover:bg-notion-dark-gray/90"} transition-all duration-300`}
        >
          Study Plan
        </button>
      </div>

      {activeView === "planSetup" && (
        <StudyForm
          subjects={subjects}
          setSubjects={setSubjects}
          freeTimes={freeTimes}
          setFreeTimes={setFreeTimes}
          breakDuration={breakDuration}
          setBreakDuration={setBreakDuration}
          slotDuration={slotDuration}
          setSlotDuration={setSlotDuration}
          maxDailyHours={maxDailyHours}
          setMaxDailyHours={setMaxDailyHours}
          onSubmit={handleFormSubmit}
          templates={savedTemplates}
          fetchTemplates={fetchTemplatesAsync}
        />
      )}
      {activeView === "studyPlan" && (
        <StudyPlan
          schedule={schedule}
          onToggleComplete={toggleComplete}
          onClearSchedule={clearSchedule}
          progress={progress}
          isGenerating={isGenerating}
          isPremium={isPremium}
        />
      )}

      {error && !isGenerating && (
        <div className="mt-4 p-4 bg-notion-red/20 dark:bg-notion-dark-red/20 text-notion-red dark:text-notion-dark-red rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
      {warning && !isGenerating && schedule.length > 0 && (
        <div className="mt-4 p-4 bg-notion-yellow/20 dark:bg-notion-dark-yellow/20 text-notion-yellow dark:text-notion-dark-yellow rounded-lg">
          <p className="text-sm">{warning}</p>
        </div>
      )}
    </main>
  );
}