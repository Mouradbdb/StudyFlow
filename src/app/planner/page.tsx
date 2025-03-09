"use client";

import { useState, useEffect, Suspense } from "react";
import StudyForm from "../components/StudyForm";
import StudyPlan from "../components/StudyPlan";
import { generateSchedule, ScheduleSlot } from "../utils/scheduler";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileMenu from "../components/ProfileMenu";
import { motion, AnimatePresence } from "framer-motion";

interface Subject {
  name: string;
  hours: number;
  priority: "High" | "Medium" | "Low";
  color?: string;
}
interface FreeTime {
  day: string;
  start: string;
  end: string;
}
interface Template {
  id: string;
  name: string;
  data: { subjects: Subject[]; freeTimes: FreeTime[] };
}
interface UserProfile {
  email: string;
  is_premium: boolean;
}

// Type declaration for adsbygoogle
declare global {
  interface Window {
    adsbygoogle: {
      push: (config?: object) => void;
    };
  }
}

function PlannerContent() {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<"planSetup" | "studyPlan">("planSetup");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>([]);
  const [breakDuration, setBreakDuration] = useState(15);
  const [slotDuration, setSlotDuration] = useState(120);
  const [maxDailyHours, setMaxDailyHours] = useState(8);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackReaction, setFeedbackReaction] = useState<string | null>(null);
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

        const { data: authUser, error: authError } = await supabase.auth.getUser();
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", session.user.id)
          .limit(1);

        if (authError) {
          console.error("Error fetching auth user:", authError.message);
          toast.error("Error fetching user profile: " + authError.message);
        } else if (userError) {
          console.error("Error fetching premium status:", userError.message);
          toast.error("Error fetching premium status: " + userError.message);
        } else if (authUser && userData && userData.length > 0) {
          setUserProfile({ email: authUser.user.email || "", is_premium: userData[0].is_premium || false });
          setIsPremium(userData[0].is_premium || false);
        }

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
                toast.success("Welcome to Premium! Enjoy ad-free planning and more.");
                setIsPremium(true);
                setUserProfile((prev) => prev ? { ...prev, is_premium: true } : null);
                router.replace("/planner");
              }
            }
          } else {
            const { error } = await res.json();
            console.error("Payment verification failed:", error);
            toast.error("Payment verification failed: " + error);
          }
        }
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsSignedIn(!!session);
      if (event === "SIGNED_IN" && session) {
        await fetchSchedule(session.user.id, getWeekStart());
        await fetchTemplates(session.user.id);

        const { data: authUser, error: authError } = await supabase.auth.getUser();
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("is_premium")
          .eq("id", session.user.id)
          .limit(1);

        if (authError) {
          console.error("Error fetching auth user on auth change:", authError.message);
          toast.error("Error fetching user profile: " + authError.message);
        } else if (userError) {
          console.error("Error fetching premium status on auth change:", userError.message);
          toast.error("Error fetching premium status: " + userError.message);
        } else if (authUser && userData && userData.length > 0) {
          setUserProfile({ email: authUser.user.email || "", is_premium: userData[0].is_premium || false });
          setIsPremium(userData[0].is_premium || false);
        }
      } else if (event === "SIGNED_OUT") {
        setSchedule([]);
        setSavedTemplates([]);
        setIsPremium(false);
        setUserProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!isPremium) {
      console.log("Pushing banner ad");
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense banner error:", e);
      }
    }
  }, [isPremium]);

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

    setIsGenerating(true);
    setError(null);
    setWarning(null);

    const randomDelay = Math.floor(Math.random() * 1000) + 500;

    const generate = async () => {
      try {
        const originalWarn = console.warn;
        let warningMessage: string | null = null;
        console.warn = (...args: (string | number | object)[]) => {
          warningMessage = args.map(arg => String(arg)).join(" ");
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
            toast.success("Study plan saved!");
          }
        } else {
          toast.info("Sign in to save your study plan!");
        }

        console.warn = originalWarn;
        if (warningMessage) setWarning(warningMessage);
        toast.success("Study plan generated!");
        if (activeView === "planSetup") {
          setActiveView("studyPlan");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while generating the schedule.");
      } finally {
        setIsGenerating(false);
      }
    };

    if (!isPremium) {
      setShowAdModal(true);
      setTimeout(() => {
        console.log("Pushing regeneration ad");
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setShowAdModal(false);
          generate();
        } catch (e) {
          console.error("AdSense error:", e);
          setShowAdModal(false);
          generate(); // Fallback if ad fails
        }
      }, 5000); // 5 seconds to ensure ad loads
    } else {
      setTimeout(generate, randomDelay);
    }
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

  const fetchTemplatesAsync = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchTemplates(user.id);
    }
  };

  const progress = calculateProgress(schedule);

  const handleFeedbackSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!feedbackText.trim() && !feedbackReaction) {
      toast.error("Please provide feedback or a reaction!");
      return;
    }

    const feedbackData = {
      user_id: user?.id || null,
      text: feedbackText.trim() || null,
      reaction: feedbackReaction || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("feedback").insert(feedbackData);
    if (error) {
      console.error("Feedback submission error:", error.message);
      toast.error("Failed to submit feedback. Please try again.");
    } else {
      toast.success("Feedback submitted! Thank you!");
      setFeedbackText("");
      setFeedbackReaction(null);
      setShowFeedbackModal(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-notion-bg to-notion-bg/80 dark:from-notion-dark-bg dark:to-notion-dark-bg/80 min-h-screen rounded-xl shadow-lg"
    >
      <header className="flex justify-between items-center mb-8">
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <h1 className="text-4xl font-extrabold text-notion-text dark:text-notion-dark-text bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red">
            Study Planner
          </h1>
          {isPremium && (
            <span className="px-3 py-1 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white text-sm font-medium rounded-full shadow-md">
              Premium ✨
            </span>
          )}
        </motion.div>
        <div className="flex items-center gap-6">
          {!isPremium && (
            <motion.a
              href="/pricing"
              whileHover={{ scale: 1.05 }}
              className="text-sm font-medium text-notion-blue dark:text-notion-dark-blue px-4 py-2 rounded-lg bg-notion-gray/10 hover:bg-notion-gray/20 dark:bg-notion-dark-gray/10 dark:hover:bg-notion-dark-gray/20 transition-all duration-200"
            >
              Unlock Premium
            </motion.a>
          )}
          {isSignedIn && userProfile ? (
            <ProfileMenu user={userProfile} />
          ) : (
            <motion.a
              href="/sign-in"
              whileHover={{ scale: 1.05 }}
              className="text-sm font-medium text-notion-blue dark:text-notion-dark-blue px-4 py-2 rounded-lg bg-notion-gray/10 hover:bg-notion-gray/20 dark:bg-notion-dark-gray/10 dark:hover:bg-notion-dark-gray/20 transition-all duration-200"
            >
              Sign In
            </motion.a>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowFeedbackModal(true)}
            className="text-sm font-medium text-notion-blue dark:text-notion-dark-blue px-4 py-2 rounded-lg bg-notion-gray/10 hover:bg-notion-gray/20 dark:bg-notion-dark-gray/10 dark:hover:bg-notion-dark-gray/20 transition-all duration-200"
          >
            Feedback
          </motion.button>
        </div>
      </header>

      <motion.div
        className="flex gap-4 mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {["planSetup", "studyPlan"].map((view) => (
          <motion.button
            key={view}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(view as "planSetup" | "studyPlan")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm shadow-md transition-all duration-300 ${activeView === view
                ? "bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white"
                : "bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/70 dark:hover:bg-notion-dark-gray/70"
              }`}
          >
            {view === "planSetup" ? "Plan Setup" : "Study Plan"}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeView === "planSetup" && (
          <motion.div
            key="planSetup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        )}
        {activeView === "studyPlan" && (
          <motion.div
            key="studyPlan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StudyPlan
              schedule={schedule}
              onToggleComplete={toggleComplete}
              onClearSchedule={clearSchedule}
              progress={progress}
              isGenerating={isGenerating}
              isPremium={isPremium}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-notion-red/10 dark:bg-notion-dark-red/10 text-notion-red dark:text-notion-dark-red rounded-xl border border-notion-red/20 dark:border-notion-dark-red/20 shadow-md"
          >
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
        {warning && !isGenerating && schedule.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-notion-yellow/10 dark:bg-notion-dark-yellow/10 text-notion-yellow dark:text-notion-dark-yellow rounded-xl border border-notion-yellow/20 dark:border-notion-dark-yellow/20 shadow-md"
          >
            <p className="text-sm font-medium">{warning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner Ad for Free Users */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <ins
            className="adsbygoogle"
            style={{ display: "inline-block", width: "728px", height: "90px" }}
            data-ad-client="ca-pub-9139235274050125"
            data-ad-slot="1670033250"
            data-adtest="on" // Test mode for local testing
          />
        </motion.div>
      )}

      <AnimatePresence>
        {showAdModal && (
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
              className="bg-white dark:bg-notion-dark-card p-8 rounded-2xl shadow-2xl max-w-md w-full border border-notion-gray/20 dark:border-notion-dark-gray/20 text-center"
            >
              <h2 className="text-xl font-bold text-notion-text dark:text-notion-dark-text mb-4">
                Advertisement
              </h2>
              <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-9139235274050125"
                data-ad-slot="6922359933"
                data-ad-format="auto"
                data-full-width-responsive="true"
                data-adtest="on" // Test mode for local testing
              />
              <p className="text-notion-text dark:text-notion-dark-text mt-4 text-sm">
                Generating your plan after this ad. Upgrade to Premium for ad-free planning!
              </p>
              <motion.a
                whileHover={{ scale: 1.05 }}
                href="/pricing"
                className="mt-4 inline-block px-6 py-2 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-xl font-medium hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 shadow-md"
              >
                Go Premium
              </motion.a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
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
              className="bg-notion-dark-bg text-notion-dark-text p-6 rounded-2xl shadow-2xl max-w-md w-full border border-notion-dark-gray/20 text-center"
            >
              <h2 className="text-xl font-bold mb-4">Your Feedback</h2>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Your feedback..."
                className="w-full h-32 p-2 bg-notion-dark-card text-notion-dark-text border border-notion-dark-gray/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-notion-blue"
              />
              <div className="flex justify-center gap-4 mt-4">
                {["😊", "🙂", "😐", "😕"].map((emoji) => (
                  <motion.button
                    key={emoji}
                    onClick={() => setFeedbackReaction(emoji)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`text-2xl p-2 rounded-full transition-all duration-200 ${feedbackReaction === emoji
                        ? "bg-notion-blue/20 border-2 border-notion-blue text-notion-blue"
                        : "bg-notion-dark-gray/10 hover:bg-notion-dark-gray/30 border-2 border-transparent"
                      }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackText("");
                    setFeedbackReaction(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-notion-gray/10 hover:bg-notion-gray/20 dark:bg-notion-dark-gray/10 dark:hover:bg-notion-dark-gray/20 transition-all duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={handleFeedbackSubmit}
                  className="px-4 py-2 rounded-lg bg-notion-blue text-white hover:bg-notion-blue/90 transition-all duration-200"
                >
                  Send
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default function Planner() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlannerContent />
    </Suspense>
  );
}