import { Suspense, ReactNode } from "react";
import "./globals.css"; // Assuming you have global styles
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Load AdSense script in head */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9139235274050125"
          crossOrigin="anonymous"
          dangerouslySetInnerHTML={{ __html: "" }} // Empty content to satisfy TS
        />
      </head>
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