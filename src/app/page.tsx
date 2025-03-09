"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
    const features = [
        {
            title: "Visual Calendar View",
            description: "Plan your week with a sleek, interactive calendar that brings clarity to your study sessions.",
            icon: "📅",
        },
        {
            title: "Daily Hour Limits",
            description: "Balance your workload with customizable daily caps, designed for sustainable studying.",
            icon: "⏰",
        },
        {
            title: "Smart Regeneration",
            description: "Redesign your schedule effortlessly with a single click for a fresh, optimized plan.",
            icon: "🔄",
        },
    ];

    const heroVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
    };

    const featureVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: (i: number) => ({
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, delay: i * 0.2, ease: "easeOut" },
        }),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-notion-bg via-white to-notion-gray/50 dark:from-notion-dark-bg dark:via-gray-900 dark:to-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text transition-colors duration-500">
            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,128,237,0.15),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(74,140,255,0.2),transparent_70%)] pointer-events-none" />
                <motion.h1
                    className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red dark:from-notion-dark-blue dark:to-notion-dark-red tracking-tight"
                    variants={heroVariants}
                    initial="hidden"
                    animate="visible"
                >
                    StudyFlow
                </motion.h1>
                <motion.p
                    className="text-lg sm:text-xl md:text-2xl mb-8 sm:mb-10 max-w-3xl font-light tracking-wide text-notion-text/80 dark:text-notion-dark-text/80"
                    variants={heroVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.2 }}
                >
                    Transform your study routine with flow and precision.
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
                            className="relative bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                        >
                            <span className="relative z-10">Get Started</span>
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        className="text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-12 sm:mb-16 bg-clip-text text-transparent bg-gradient-to-r from-notion-text to-notion-blue dark:from-notion-dark-text dark:to-notion-dark-blue"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        Crafted for Your Success
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="relative bg-white dark:bg-notion-dark-card p-6 sm:p-8 rounded-2xl shadow-lg border border-notion-gray/30 dark:border-notion-dark-gray/30 hover:shadow-xl transition-all duration-300"
                                custom={index}
                                variants={featureVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white w-12 h-12 flex items-center justify-center rounded-full text-2xl shadow-md"
                                >
                                    {feature.icon}
                                </motion.div>
                                <h3 className="text-lg sm:text-xl font-semibold mt-8 mb-3 text-notion-text dark:text-notion-dark-text">
                                    {feature.title}
                                </h3>
                                <p className="text-notion-text/70 dark:text-notion-dark-secondary text-sm sm:text-base leading-relaxed">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-20 px-4 sm:px-6 text-center">
                <motion.h2
                    className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-6 sm:mb-8 text-notion-text dark:text-notion-dark-text"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                >
                    Elevate Your Study Game
                </motion.h2>
                <motion.p
                    className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto text-notion-text/70 dark:text-notion-dark-secondary leading-relaxed"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    Join thousands of students mastering their schedules with StudyFlow.
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
                            className="bg-gradient-to-r from-notion-red to-notion-dark-red text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            Start Planning Now
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-8 sm:py-10 px-4 sm:px-6 text-center bg-notion-gray/20 dark:bg-notion-dark-gray/20 text-notion-text/70 dark:text-notion-dark-secondary">
                <p className="text-xs sm:text-sm">
                    © {new Date().getFullYear()} StudyFlow by xAI. Built with passion for smarter studying.
                </p>
            </footer>
        </div>
    );
}