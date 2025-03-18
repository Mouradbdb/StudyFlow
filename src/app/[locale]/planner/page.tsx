"use client";

import { useState, useEffect, Suspense } from "react";
import StudyForm from "../../components/StudyForm";
import StudyPlan from "../../components/StudyPlan";
import { generateSchedule, ScheduleSlot } from "../../utils/scheduler";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileMenu from "../../components/ProfileMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";

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

declare global {
  interface Window {
    adsbygoogle: { push: (config?: object) => void };
  }
}

function PlannerContent() {
  const t = useTranslations("Planner");
  const tToasts = useTranslations("Planner.toasts");
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const [activeView, setActiveView] = useState<"planSetup" | "studyPlan">("planSetup");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [freeTimes, setFreeTimes] = useState<FreeTime[]>([]);
  const [breakDuration, setBreakDuration] = useState(5);
  const [slotDuration, setSlotDuration] = useState(120);
  const [maxDailyHours, setMaxDailyHours] = useState(4);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackReaction, setFeedbackReaction] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true); // Start loading
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error.message);
        setIsLoading(false);
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
          toast.error(tToasts("fetchUserFailed", { error: authError.message }));
        } else if (userError) {
          console.error("Error fetching premium status:", userError.message);
          toast.error(tToasts("fetchPremiumFailed", { error: userError.message }));
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
                toast.error(tToasts("premiumUpdateFailed"));
              } else {
                console.log("Payment verified, user updated to premium");
                toast.success(tToasts("welcomePremium"));
                setIsPremium(true);
                setUserProfile((prev) => prev ? { ...prev, is_premium: true } : null);
                router.replace("/planner");
              }
            }
          } else {
            const { error } = await res.json();
            console.error("Payment verification failed:", error);
            toast.error(tToasts("paymentFailed", { error }));
          }
        }
      }
      setIsLoading(false); // End loading
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true); // Start loading on auth state change
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
          toast.error(tToasts("fetchUserFailed", { error: authError.message }));
        } else if (userError) {
          console.error("Error fetching premium status on auth change:", userError.message);
          toast.error(tToasts("fetchPremiumFailed", { error: userError.message }));
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
      setIsLoading(false); // End loading
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, searchParams, tToasts]);

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
      toast.error(tToasts("loadScheduleFailed"));
    } else if (data && data.length > 0) {
      setSchedule(data[0].schedule);
      toast.success(tToasts("planSaved"));
    } else {
      setSchedule([]);
      toast.info(tToasts("newWeek"));
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
      toast.error(tToasts("loadTemplatesFailed"));
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
      toast.error(tToasts("signInRequired"));
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
              toast.error(tToasts("loadScheduleFailed"));
              throw upsertError;
            }
            toast.success(tToasts("planSaved"));
          }
        } else {
          toast.info(tToasts("planSignInToSave"));
        }

        console.warn = originalWarn;
        if (warningMessage) setWarning(warningMessage);
        toast.success(tToasts("planGenerated"));
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
          generate();
        }
      }, 5000);
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
          toast.error(tToasts("loadScheduleFailed"));
        }
      }
    }
    toast.success(tToasts("scheduleCleared"));
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
                toast.error(tToasts("loadScheduleFailed"));
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
      toast.error(tToasts("feedbackEmpty"));
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
      toast.error(tToasts("feedbackFailed"));
    } else {
      toast.success(tToasts("feedbackSuccess"));
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
      className="w-full min-h-screen p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950"
    >
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <Image
              src="/logo.png"
              alt="Planner Logo"
              width={40}
              height={40}
              className="rounded-full shadow-md"
            />
            <h1 className="text-2xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 tracking-tight">
              {t("title")}
            </h1>
            {isPremium && (
              <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs sm:text-sm font-medium rounded-full shadow-md">
                {t("premiumBadge")}
              </span>
            )}
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-6 flex-wrap justify-center">
            {!isPremium && (
              <motion.a
                href="/pricing"
                whileHover={{ scale: 1.05 }}
                className="text-xs sm:text-sm font-medium text-blue-500 dark:text-cyan-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-100/10 hover:bg-blue-100/20 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                {t("unlockPremium")}
              </motion.a>
            )}
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
              />
            ) : isSignedIn && userProfile ? (
              <ProfileMenu user={userProfile} />
            ) : (
              <motion.a
                href="/sign-in"
                whileHover={{ scale: 1.05 }}
                className="text-xs sm:text-sm font-medium text-blue-500 dark:text-cyan-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-100/10 hover:bg-blue-100/20 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                {t("signIn")}
              </motion.a>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowFeedbackModal(true)}
              className="text-xs sm:text-sm font-medium text-blue-500 dark:text-cyan-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-100/10 hover:bg-blue-100/20 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 transition-all duration-200"
            >
              {t("feedback")}
            </motion.button>
          </div>
        </header>

        <motion.div
          className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 sm:mb-8"
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
              className={`w-full sm:flex-1 py-2 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all duration-300 ${activeView === view
                ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white"
                : "bg-blue-100/50 dark:bg-blue-900/50 text-gray-900 dark:text-gray-100 hover:bg-blue-100/70 dark:hover:bg-blue-900/70"
                }`}
            >
              {t(`views.${view}`)}
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
              className="w-full"
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
              className="w-full"
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
              className="mt-4 sm:mt-6 p-4 bg-red-100/10 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl border border-red-200/20 dark:border-red-900/20 shadow-md text-xs sm:text-sm"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
          {warning && !isGenerating && schedule.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 sm:mt-6 p-4 bg-yellow-100/10 dark:bg-yellow-900/10 text-yellow-600 dark:text-yellow-400 rounded-xl border border-yellow-200/20 dark:border-yellow-900/20 shadow-md text-xs sm:text-sm"
            >
              <p className="font-medium">{warning}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 sm:mt-6 text-center"
          >
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "90px" }}
              data-ad-client="ca-pub-9139235274050125"
              data-ad-slot="1670033250"
              data-ad-format="auto"
              data-full-width-responsive="true"
              data-adtest="on"
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
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/20 dark:border-gray-700/20 text-center"
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {t("adModal.title")}
                </h2>
                <ins
                  className="adsbygoogle"
                  style={{ display: "block" }}
                  data-ad-client="ca-pub-9139235274050125"
                  data-ad-slot="6922359933"
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                  data-adtest="on"
                />
                <p className="text-gray-600 dark:text-gray-400 mt-4 text-xs sm:text-sm">
                  {t("adModal.message")}
                </p>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  href="/pricing"
                  className="mt-4 inline-block px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl font-medium text-xs sm:text-sm hover:from-blue-500/90 hover:to-cyan-400/90 transition-all duration-200 shadow-md"
                >
                  {t("adModal.goPremium")}
                </motion.a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="bg-gray-800 text-gray-100 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/20 text-center"
              >
                <h2 className="text-lg sm:text-xl font-bold mb-4">{t("feedbackModal.title")}</h2>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={t("feedbackModal.placeholder")}
                  className="w-full h-24 sm:h-32 p-2 bg-gray-700 text-gray-100 border border-gray-600/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <div className="flex justify-center gap-2 sm:gap-4 mt-4">
                  {["😊", "🙂", "😐", "😕"].map((emoji) => (
                    <motion.button
                      key={emoji}
                      onClick={() => setFeedbackReaction(emoji)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className={`text-xl sm:text-2xl p-1 sm:p-2 rounded-full transition-all duration-200 ${feedbackReaction === emoji
                        ? "bg-blue-500/20 border-2 border-blue-500 text-blue-500"
                        : "bg-gray-600/10 hover:bg-gray-600/30 border-2 border-transparent"
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
                    className="px-3 sm:px-4 py-1 sm:py-2 rounded-lg bg-gray-600/10 hover:bg-gray-600/20 transition-all duration-200 text-xs sm:text-sm"
                  >
                    {t("feedbackModal.cancel")}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={handleFeedbackSubmit}
                    className="px-3 sm:px-4 py-1 sm:py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-500/90 transition-all duration-200 text-xs sm:text-sm"
                  >
                    {t("feedbackModal.send")}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

export default function Planner() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PlannerContent />
    </Suspense>
  );
}