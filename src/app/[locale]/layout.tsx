import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ReactNode } from "react";
import "../globals.css";
import { Toaster } from "sonner";
import { DarkModeProvider } from "../lib/DarkModeContext";
import DarkModeToggle from "../components/DarkModeToggle";


export const metadata = {
  title: "Plan2study",
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-adsense-account" content="ca-pub-9139235274050125" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9139235274050125"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-notion-bg text-notion-text dark:bg-notion-dark-bg dark:text-notion-dark-text min-h-screen transition-colors duration-300">
        <DarkModeProvider>
          <NextIntlClientProvider>
            <header className="fixed top-0 right-0 p-4 z-50">
              <DarkModeToggle />
            </header>
            {children}
            <Analytics />
            <SpeedInsights />
            <Toaster richColors position="top-left" />
          </NextIntlClientProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}