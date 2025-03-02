"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { motion } from "framer-motion";
import { useDarkMode } from "../lib/DarkModeContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface ScheduleSlot {
  day: string;
  start: string;
  end: string;
  subject: string;
  completed: boolean;
  color?: string;
}

interface WeeklySchedule {
  week_start: string;
  schedule: ScheduleSlot[];
}

export default function Dashboard() {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error.message);
        return;
      }
      setIsSignedIn(!!session);
      if (session) {
        const { data, error } = await supabase
          .from("schedules")
          .select("week_start, schedule")
          .eq("user_id", session.user.id)
          .order("week_start", { ascending: false });
        if (error) {
          console.error("Fetch schedules error:", error.message);
          toast.error("Failed to load schedules.");
        } else if (data) {
          setWeeklySchedules(data);
          setSelectedWeekIndex(0);
        }
      }
    };
    checkSession();
  }, []);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-notion-bg dark:bg-notion-dark-bg p-4">
        <p className="text-notion-text dark:text-notion-dark-text text-lg">Sign in to view your StudyFlow dashboard!</p>
      </div>
    );
  }

  const handlePrevWeek = () => {
    setIsLoading(true);
    setSelectedWeekIndex((prev) => Math.min(prev + 1, weeklySchedules.length - 1));
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleNextWeek = () => {
    setIsLoading(true);
    setSelectedWeekIndex((prev) => Math.max(prev - 1, 0));
    setTimeout(() => setIsLoading(false), 300);
  };

  const currentSchedule = weeklySchedules[selectedWeekIndex]?.schedule || [];
  const currentWeekStart = weeklySchedules[selectedWeekIndex]?.week_start || "No week selected";

  const chartColors = {
    primary: isDarkMode ? "#4A90E2" : "#2F80ED",
    secondary: isDarkMode ? "#D3D3D3" : "#E0E0E0",
    text: isDarkMode ? "#FFFFFF" : "#1A1A1A",
    subjectColors: isDarkMode
      ? ["#FF6B6B", "#FFD700", "#90EE90", "#87CEEB", "#DDA0DD", "#FFB6C1", "#98FB98", "#F08080", "#B0E0E6"]
      : COLORS,
  };

  const completionRate = currentSchedule.length
    ? parseFloat(((currentSchedule.filter((slot) => slot.completed).length / currentSchedule.length) * 100).toFixed(1))
    : 0;
  const completionData = {
    datasets: [{
      data: [completionRate, 100 - completionRate],
      backgroundColor: [chartColors.primary, chartColors.secondary],
      borderWidth: 0,
    }],
  };
  const completionOptions = {
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, callbacks: { label: (context: any) => `${context.raw}%` } },
    },
  };

  const totalStudyHours = currentSchedule
    .filter((slot) => slot.subject !== "Break")
    .reduce((sum, slot) => {
      const [startH, startM] = slot.start.split(":").map(Number);
      const [endH, endM] = slot.end.split(":").map(Number);
      return sum + (endH + endM / 60 - (startH + startM / 60));
    }, 0);

  const dailyDataRaw = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
    day,
    hours: currentSchedule
      .filter((slot) => slot.day === day && slot.subject !== "Break")
      .reduce((sum, slot) => {
        const [startH, startM] = slot.start.split(":").map(Number);
        const [endH, endM] = slot.end.split(":").map(Number);
        return sum + (endH + endM / 60 - (startH + startM / 60));
      }, 0),
  }));
  const dailyData = {
    labels: dailyDataRaw.map((d) => d.day.slice(0, 3)),
    datasets: [{
      label: "Hours",
      data: dailyDataRaw.map((d) => d.hours.toFixed(1)),
      backgroundColor: chartColors.primary,
      borderColor: chartColors.primary,
      borderWidth: 1,
      borderRadius: 8,
    }],
  };
  const dailyOptions = {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context: any) => `${context.raw}h` } },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Hours", color: chartColors.text }, ticks: { color: chartColors.text } },
      x: { title: { display: true, text: "Day", color: chartColors.text }, ticks: { color: chartColors.text } },
    },
    maintainAspectRatio: false,
  };

  const subjectDataRaw = Object.entries(
    currentSchedule
      .filter((slot) => slot.subject !== "Break")
      .reduce((acc: { [key: string]: number }, slot) => {
        const [startH, startM] = slot.start.split(":").map(Number);
        const [endH, endM] = slot.end.split(":").map(Number);
        const duration = endH + endM / 60 - (startH + startM / 60);
        acc[slot.subject] = (acc[slot.subject] || 0) + duration;
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }));
  const subjectData = {
    labels: subjectDataRaw.map((s) => s.name),
    datasets: [{
      data: subjectDataRaw.map((s) => s.value.toFixed(1)),
      backgroundColor: chartColors.subjectColors,
      borderWidth: 0,
    }],
  };
  const subjectOptions = {
    cutout: "60%",
    plugins: {
      legend: { position: "bottom" as const, labels: { color: chartColors.text } },
      tooltip: { callbacks: { label: (context: any) => `${context.label}: ${context.raw}h` } },
    },
  };

  const calculateStreak = () => {
    const weeksWithActivity = weeklySchedules
      .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
      .filter((ws) => ws.schedule.some((slot) => slot.completed));
    let streak = 0;
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    for (let i = weeksWithActivity.length - 1; i >= 0; i--) {
      const weekDate = new Date(weeksWithActivity[i].week_start);
      if (weekDate <= currentMonday && (i === weeksWithActivity.length - 1 || (weekDate.getTime() + 7 * 24 * 60 * 60 * 1000) === new Date(weeksWithActivity[i + 1].week_start).getTime())) {
        streak++;
        currentMonday.setDate(currentMonday.getDate() - 7);
      } else break;
    }
    return streak;
  };
  const streak = calculateStreak();

  const focusTime = currentSchedule.length
    ? currentSchedule
        .filter((slot) => slot.subject !== "Break" && slot.completed)
        .reduce((sum, slot) => {
          const [startH, startM] = slot.start.split(":").map(Number);
          const [endH, endM] = slot.end.split(":").map(Number);
          return sum + (endH + endM / 60 - (startH + startM / 60));
        }, 0) / currentSchedule.filter((slot) => slot.subject !== "Break" && slot.completed).length
    : 0;

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 bg-gradient-to-br from-notion-bg to-notion-gray dark:from-notion-dark-bg dark:to-notion-dark-gray min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-4xl font-extrabold text-notion-text dark:text-notion-dark-text bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red dark:from-notion-dark-blue dark:to-notion-dark-red">
          StudyFlow Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            disabled={selectedWeekIndex >= weeklySchedules.length - 1}
            className="p-2 rounded-full bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80 disabled:opacity-50 transition-colors duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg text-notion-text dark:text-notion-dark-text">
            Week of {new Date(currentWeekStart).toLocaleDateString()}
          </span>
          <button
            onClick={handleNextWeek}
            disabled={selectedWeekIndex <= 0}
            className="p-2 rounded-full bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80 disabled:opacity-50 transition-colors duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <a href="/planner" className="text-sm sm:text-base text-notion-blue dark:text-notion-dark-blue hover:underline">
          Back to Planner
        </a>
      </motion.div>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center text-notion-text dark:text-notion-dark-text text-lg"
        >
          Loading week data...
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Completion Rate</h2>
              <div className="flex justify-center">
                <div className="w-32 h-32">
                  <Doughnut data={completionData} options={completionOptions} />
                </div>
              </div>
              <p className="text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary mt-2">
                {completionRate}% completed
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Total Study Hours</h2>
              <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">{totalStudyHours.toFixed(1)}h</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-2">
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Daily Breakdown</h2>
              <div className="h-64">
                <Bar data={dailyData} options={dailyOptions} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Subject Distribution</h2>
              <div className="h-64 flex justify-center">
                <div className="w-48">
                  <Doughnut data={subjectData} options={subjectOptions} />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Study Streak</h2>
              <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">{streak} 🔥</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <div className="bg-white dark:bg-notion-dark-card border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl p-4">
              <h2 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Avg Focus Time</h2>
              <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">
                {focusTime ? `${(focusTime * 60).toFixed(0)} min` : "N/A"}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

const COLORS = ["#F28B82", "#FBCB9C", "#FFE082", "#CCFF90", "#A7FFEB", "#80DEEA", "#82B1FF", "#B388FF", "#F8BBD0"];