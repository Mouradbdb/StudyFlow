"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Pricing() {

    const [isPremium, setIsPremium] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const { data, error } = await supabase
                    .from("users")
                    .select("is_premium")
                    .eq("id", session.user.id)
                    .limit(1);
                if (error) {
                    console.error("Error fetching premium status:", error.message);
                    toast.error("Error checking your status.");
                } else if (data && data.length > 0) {
                    setIsPremium(data[0].is_premium || false);
                }
            }
        };
        checkSession();
    }, []);

    const handleUpgrade = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Please sign in to upgrade!");
            router.push("/sign-in");
            return;
        }

        if (isPremium) {
            toast.info("You’re already a premium user!");
            return;
        }

        toast.info("Redirecting to PayPal...");
        try {
            const res = await fetch("/api/paypal_payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to initiate payment");
            }

            const { approval_url } = await res.json();
            window.location.href = approval_url;
        } catch (error) {
            console.error("Upgrade error:", error);
            toast.error("Error upgrading: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-notion-bg to-notion-bg/80 dark:from-notion-dark-bg dark:to-notion-dark-bg/80 min-h-screen rounded-xl shadow-lg"
        >
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold text-notion-text dark:text-notion-dark-text bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-red">
                    Unlock Your Full Potential
                </h1>
                <p className="mt-4 text-lg md:text-xl text-notion-text dark:text-notion-dark-text max-w-2xl mx-auto">
                    Choose the plan that supercharges your study experience with powerful features.
                </p>
            </motion.header>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
                {/* Free Plan */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-6 bg-white dark:bg-notion-dark-card rounded-xl shadow-lg border border-notion-gray/20 dark:border-notion-dark-gray/20"
                >
                    <h2 className="text-2xl font-semibold text-notion-text dark:text-notion-dark-text mb-4">Free</h2>
                    <p className="text-notion-text dark:text-notion-dark-text mb-4 text-sm">Perfect for getting started.</p>
                    <ul className="space-y-3 mb-6 text-sm">
                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> Basic scheduling features
                        </li>
                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> Save your progress
                        </li>
                        <li className="flex items-center gap-2 text-notion-dark-secondary dark:text-notion-dark-secondary">
                            <span className="text-notion-red">✘</span> No Ads
                        </li>
                        <li className="flex items-center gap-2 text-notion-dark-secondary dark:text-notion-dark-secondary">
                            <span className="text-notion-red">✘</span> Unlimited study plans
                        </li>
                        <li className="flex items-center gap-2 text-notion-dark-secondary dark:text-notion-dark-secondary">
                            <span className="text-notion-red">✘</span> Advanced templates
                        </li>
                        <li className="flex items-center gap-2 text-notion-dark-secondary dark:text-notion-dark-secondary">
                            <span className="text-notion-red">✘</span> Priority support
                        </li>
                    </ul>
                    <p className="text-xl font-bold text-notion-text dark:text-notion-dark-text mb-6">$0 / forever</p>
                    {!isPremium ? (
                        <button
                            className="w-full py-3 bg-notion-gray/50 dark:bg-notion-dark-gray/50 text-notion-text dark:text-notion-dark-text rounded-xl opacity-60 cursor-not-allowed shadow-md"
                            disabled
                        >
                            Current Plan
                        </button>
                    ) : (
                        <button
                            className="w-full py-3 bg-notion-blue text-white rounded-xl hover:bg-notion-blue/90 transition-all duration-200 shadow-md"
                            onClick={() => router.push("/planner")}
                        >
                            Go to Planner
                        </button>
                    )}
                </motion.div>

                {/* Premium Plan */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-6 bg-white dark:bg-notion-dark-card rounded-xl shadow-lg border-2 border-notion-blue dark:border-notion-dark-blue relative overflow-hidden"
                >
                    <span className="absolute top-0 right-0 px-3 py-1 bg-notion-blue text-white text-xs font-medium rounded-bl-lg">
                        Recommended
                    </span>
                    <h2 className="text-2xl font-semibold text-notion-text dark:text-notion-dark-text mb-4">Premium</h2>
                    <p className="text-notion-text dark:text-notion-dark-text mb-4 text-sm">For serious students who want more.</p>
                    <ul className="space-y-3 mb-6 text-sm">

                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> Save unlimited templates
                        </li>

                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> Priority email support
                        </li>
                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> No ads
                        </li>
                        <li className="flex items-center gap-2 text-notion-text dark:text-notion-dark-text">
                            <span className="text-notion-blue">✔️</span> Early access to new features
                        </li>
                    </ul>
                    <p className="text-xl font-bold text-notion-text dark:text-notion-dark-text mb-6">$2.99 / one-time</p>
                    {isPremium ? (
                        <button
                            className="w-full py-3 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-xl opacity-60 cursor-not-allowed shadow-md"
                            disabled
                        >
                            Your Plan
                        </button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleUpgrade}
                            className="w-full py-3 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white rounded-xl hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-200 shadow-md"
                        >
                            Unlock Premium Now
                        </motion.button>
                    )}
                </motion.div>
            </motion.div>

            <motion.section
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-16"
            >
                <h3 className="text-3xl font-semibold text-center text-notion-text dark:text-notion-dark-text mb-8">
                    What Our Users Say
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { quote: "StudyFlow Premium doubled my productivity!", author: "Sarah, Student" },
                        { quote: "Unlimited plans changed how I study!", author: "Ahmed, Developer" },
                        { quote: "The best investment for my grades.", author: "Maria, Researcher" },
                    ].map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.2 }}
                            className="p-6 bg-white dark:bg-notion-dark-card rounded-xl shadow-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
                        >
                            <p className="text-notion-text dark:text-notion-dark-text text-sm italic">“{testimonial.quote}”</p>
                            <p className="mt-3 text-xs text-notion-dark-secondary dark:text-notion-dark-secondary">
                                - {testimonial.author}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            <motion.footer
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 text-center text-sm text-notion-text dark:text-notion-dark-text"
            >
                <p>
                    Questions? Contact us at{" "}
                    <a
                        href="mailto:support@studyflow.com"
                        className="text-notion-blue dark:text-notion-dark-blue hover:underline font-medium"
                    >
                        support@studyflow.com
                    </a>.
                </p>
            </motion.footer>
        </motion.main>
    );
}