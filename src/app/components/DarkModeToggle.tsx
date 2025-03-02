"use client";

import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "../lib/DarkModeContext";

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  if (isDarkMode === undefined) return null;

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80 transition-colors duration-300"
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}