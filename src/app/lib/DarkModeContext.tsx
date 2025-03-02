"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DarkModeContextType {
  isDarkMode: boolean | undefined;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    const initialMode = saved ? JSON.parse(saved) : false;
    setIsDarkMode(initialMode);
  }, []);

  useEffect(() => {
    if (isDarkMode !== undefined) {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => (prev === undefined ? false : !prev));

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
}