"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement } from "chart.js";
import { motion } from "framer-motion";
import { useDarkMode } from "../lib/DarkModeContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement);

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
        <p className="text-notion-text dark:text-notion-dark-text text-lg">Please sign in to view your dashboard</p>
      </div>
    );
  }

  const handlePrevWeek = () => setSelectedWeekIndex((prev) => Math.min(prev + 1, weeklySchedules.length - 1));
  const handleNextWeek = () => setSelectedWeekIndex((prev) => Math.max(prev - 1, 0));

  const currentSchedule = weeklySchedules[selectedWeekIndex]?.schedule || [];
  const currentWeekStart = weeklySchedules[selectedWeekIndex]?.week_start || "No week selected";

  const chartColors = {
    primary: isDarkMode ? "#4A90E2" : "#2F80ED",
    secondary: isDarkMode ? "#D3D3D3" : "#E0E0E0",
    text: isDarkMode ? "#E5E7EB" : "#374151",
    subjectColors: isDarkMode
      ? ["#FF6B6B", "#FFD700", "#90EE90", "#87CEEB", "#DDA0DD", "#FFB6C1", "#98FB98", "#F08080", "#B0E0E6"]
      : COLORS,
    trendHours: isDarkMode ? "#FFD700" : "#EB5757",
    trendCompletion: isDarkMode ? "#4A90E2" : "#2F80ED",
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
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: any) => `${context.raw}%` } } },
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
      data: dailyDataRaw.map((d) => Number(d.hours.toFixed(1))), // Convert to number
      backgroundColor: chartColors.primary,
      borderColor: chartColors.primary,
      borderWidth: 1,
      borderRadius: 8,
    }],
  };
  const dailyOptions = {
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: any) => `${context.raw}h` } } },
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
      data: subjectDataRaw.map((s) => Number(s.value.toFixed(1))), // Convert to number
      backgroundColor: chartColors.subjectColors,
      borderWidth: 0,
    }],
  };
  const subjectOptions = {
    cutout: "60%",
    plugins: {
      legend: { position: "bottom" as const, labels: { color: chartColors.text, font: { size: 12 } } },
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

  const progressData = {
    labels: weeklySchedules.slice().reverse().map((ws) => new Date(ws.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
    datasets: [
      {
        label: "Study Hours",
        data: weeklySchedules.slice().reverse().map((ws) =>
          ws.schedule
            .filter((slot) => slot.subject !== "Break")
            .reduce((sum, slot) => {
              const [startH, startM] = slot.start.split(":").map(Number);
              const [endH, endM] = slot.end.split(":").map(Number);
              return sum + (endH + endM / 60 - (startH + startM / 60));
            }, 0)
        ),
        borderColor: chartColors.trendHours,
        backgroundColor: chartColors.trendHours,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Completion Rate",
        data: weeklySchedules.slice().reverse().map((ws) =>
          ws.schedule.length
            ? (ws.schedule.filter((slot) => slot.completed).length / ws.schedule.length) * 100
            : 0
        ),
        borderColor: chartColors.trendCompletion,
        backgroundColor: chartColors.trendCompletion,
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };
  const progressOptions = {
    plugins: {
      legend: { position: "top" as const, labels: { color: chartColors.text, font: { size: 12 } } },
      tooltip: { callbacks: { label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(1)}${context.dataset.label === "Completion Rate" ? "%" : "h"}` } },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Value", color: chartColors.text }, ticks: { color: chartColors.text } },
      x: { title: { display: true, text: "Week", color: chartColors.text }, ticks: { color: chartColors.text, maxRotation: 45, minRotation: 45 } },
    },
    maintainAspectRatio: false,
  };

  return (
    <main className="max-w-6xl mx-auto p-6 bg-notion-bg dark:bg-notion-dark-bg min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-8"
      >
        <h1 className="text-3xl font-bold text-notion-text dark:text-notion-dark-text">Dashboard</h1>
        <a href="/planner" className="text-sm text-notion-blue dark:text-notion-dark-blue hover:underline">Back to Planner</a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-center gap-4 mb-8"
      >
        <button
          onClick={handlePrevWeek}
          disabled={selectedWeekIndex >= weeklySchedules.length - 1}
          className="p-2 rounded-full bg-notion-gray/20 dark:bg-notion-dark-gray/20 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/30 dark:hover:bg-notion-dark-gray/30 disabled:opacity-50 transition-colors duration-200"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-xl font-semibold text-notion-text dark:text-notion-dark-text">
          {new Date(currentWeekStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={handleNextWeek}
          disabled={selectedWeekIndex <= 0}
          className="p-2 rounded-full bg-notion-gray/20 dark:bg-notion-dark-gray/20 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/30 dark:hover:bg-notion-dark-gray/30 disabled:opacity-50 transition-colors duration-200"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6 mb-8"
      >
        <h2 className="text-lg font-semibold text-notion-text dark:text-notion-dark-text mb-4">Progress Over Time</h2>
        <div className="h-80">
          <Line data={progressData} options={progressOptions} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Completion Rate</h3>
            <div className="flex justify-center">
              <div className="w-32 h-32">
                <Doughnut data={completionData} options={completionOptions} />
              </div>
            </div>
            <p className="text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary mt-2">{completionRate}%</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Total Study Hours</h3>
            <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">{totalStudyHours.toFixed(1)}h</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="lg:col-span-2">
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Daily Breakdown</h3>
            <div className="h-64">
              <Bar data={dailyData} options={dailyOptions} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Subject Distribution</h3>
            <div className="h-64 flex justify-center">
              <div className="w-48">
                <Doughnut data={subjectData} options={subjectOptions} />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Study Streak</h3>
            <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">{streak} 🔥</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}>
          <div className="bg-white dark:bg-notion-dark-card rounded-xl shadow-md p-6">
            <h3 className="text-md font-semibold text-notion-text dark:text-notion-dark-text mb-2">Avg Focus Time</h3>
            <p className="text-3xl font-bold text-notion-blue dark:text-notion-dark-blue text-center">
              {focusTime ? `${(focusTime * 60).toFixed(0)} min` : "N/A"}
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

const COLORS = ["#F28B82", "#FBCB9C", "#FFE082", "#CCFF90", "#A7FFEB", "#80DEEA", "#82B1FF", "#B388FF", "#F8BBD0"];