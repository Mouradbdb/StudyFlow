import { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "sonner";
import { DarkModeProvider } from "./lib/DarkModeContext";
import DarkModeToggle from "./components/DarkModeToggle";

export const metadata = {
  title: "Study Planner",
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-notion-bg text-notion-text dark:bg-notion-dark-bg dark:text-notion-dark-text min-h-screen transition-colors duration-300">
        <DarkModeProvider>
          <header className="fixed top-0 right-0 p-4 z-50">
            <DarkModeToggle />
          </header>
          {children}
          <Toaster richColors position="top-left" />
        </DarkModeProvider>
      </body>
    </html>
  );
}