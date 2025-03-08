"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion"; // Added for animations

interface ProfileMenuProps {
    user: { email: string; is_premium: boolean };
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSignOut = async () => {
        console.log("Initiating sign out...");
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Sign out error:", error.message);
                toast.error("Failed to sign out: " + error.message);
                return;
            }
            console.log("Sign out successful");
            toast.success("Signed out successfully!");
            router.push("/sign-in");
        } catch (error) {
            console.error("Unexpected error during sign out:", error);
            toast.error("Error signing out: " + (error instanceof Error ? error.message : "Unknown error"));
        }
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-notion-blue dark:text-notion-dark-blue bg-notion-gray/10 dark:bg-notion-dark-card/20 hover:bg-notion-gray/20 dark:hover:bg-notion-dark-card/30 transition-colors duration-200"
            >
                <span className="truncate max-w-[150px]">{user.email.split("@")[0]}</span>
                <motion.svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-notion-dark-card rounded-xl shadow-xl p-4 z-50 border border-notion-gray/20 dark:border-notion-dark-gray/20"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-notion-blue to-notion-red flex items-center justify-center text-white font-medium">
                                    {user.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-notion-text dark:text-notion-dark-text truncate max-w-[180px]">
                                        {user.email}
                                    </p>
                                    <p className="text-xs text-notion-gray-text dark:text-notion-dark-gray-text">
                                        Plan:{" "}
                                        <span className={user.is_premium ? "text-notion-blue" : "text-notion-gray"}>
                                            {user.is_premium ? "Premium" : "Free"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSignOut}
                                className="w-full py-2 px-4 bg-gradient-to-r from-notion-red to-notion-red/80 dark:from-notion-dark-red dark:to-notion-dark-red/80 text-white rounded-lg text-sm font-medium hover:from-notion-red/90 hover:to-notion-red/70 dark:hover:from-notion-dark-red/90 dark:hover:to-notion-dark-red/70 transition-all duration-200 shadow-md"
                            >
                                Sign Out
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}