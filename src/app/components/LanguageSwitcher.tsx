"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => switchLocale("en")}
        className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 ${
          locale === "en"
            ? "bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white"
            : "bg-notion-gray/20 dark:bg-notion-dark-gray/20 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/40 dark:hover:bg-notion-dark-gray/40"
        }`}
      >
        {t("english")}
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => switchLocale("fr")}
        className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 ${
          locale === "fr"
            ? "bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white"
            : "bg-notion-gray/20 dark:bg-notion-dark-gray/20 text-notion-text dark:text-notion-dark-text hover:bg-notion-gray/40 dark:hover:bg-notion-dark-gray/40"
        }`}
      >
        {t("french")}
      </motion.button>
    </div>
  );
}