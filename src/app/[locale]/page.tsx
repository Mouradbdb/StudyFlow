"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Repeat } from "lucide-react";

export default function LandingPage() {
  const t = useTranslations("LandingPage");
  const tFeatures = useTranslations("LandingPage.features");

  const features = tFeatures.raw("items").map((item, index) => ({
    title: item.title,
    description: item.description,
    icon: [Calendar, Clock, Repeat][index], // Lucide React icons
  }));

  const heroVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const featureVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, delay: i * 0.2, ease: "easeOut" },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(64,196,255,0.1),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(64,196,255,0.15),transparent_70%)] pointer-events-none" />
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/logo.png"
            alt="Logo"
            width={120}
            height={120}
            className="rounded-full shadow-lg"
            priority
          />
        </motion.div>
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 tracking-tight"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
        >
          {t("hero.title")}
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl md:text-2xl mb-10 max-w-3xl font-light tracking-wide text-gray-700 dark:text-gray-300"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          {t("hero.subtitle")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link href="/planner">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">{t("hero.button")}</span>
              <div className="absolute inset-0 bg-blue-600 opacity-0 hover:opacity-20 transition-opacity duration-300" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-blue-500 dark:from-gray-100 dark:to-blue-400"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {tFeatures("title")}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-md border border-blue-100 dark:border-blue-900 hover:shadow-lg transition-all duration-300"
                  custom={index}
                  variants={featureVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 text-white w-12 h-12 flex items-center justify-center rounded-full shadow-md"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mt-10 mb-3 text-gray-900 dark:text-gray-100">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 text-center bg-blue-50 dark:bg-blue-950">
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-8 text-gray-900 dark:text-gray-100"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {t("cta.title")}
        </motion.h2>
        <motion.p
          className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-gray-600 dark:text-gray-400 leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          {t("cta.subtitle")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Link href="/planner">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("cta.button")}
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 text-center bg-blue-100 dark:bg-blue-900 text-gray-600 dark:text-gray-400">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt="Footer Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
        </div>
        <p className="text-sm">
          {t("footer.text", { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}