"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "en", name: t("english") },
    { code: "fr", name: t("french") },
  ];

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    setIsOpen(false);
  };

  const variants = {
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    closed: {
      x: "100%",
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/80 dark:hover:bg-notion-dark-gray/80 transition-colors duration-300"
      >
        <Globe className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={variants}
            className="fixed top-0 right-0 h-screen w-64 bg-notion-gray dark:bg-notion-dark-gray shadow-lg z-50"
          >
            <div className="p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold mt-2 mb-4 text-notion-text dark:text-notion-dark-text">
                Languages
              </h3>
              <div className="flex flex-col gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => switchLocale(lang.code)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-notion-text dark:text-notion-dark-text transition-colors ${locale === lang.code
                        ? "bg-notion-blue/20 dark:bg-notion-dark-blue/20 text-notion-blue dark:text-notion-dark-blue"
                        : "hover:bg-notion-gray/20 dark:hover:bg-notion-dark-gray/20"
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-notion-blue dark:bg-notion-dark-blue" />
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}