"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const t = useTranslations("ResetPassword"); // Namespace for reset password page
    const tToasts = useTranslations("ResetPassword.toasts"); // Namespace for toast messages

    useEffect(() => {
        const handleRedirect = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session) {
                toast.error(tToasts("invalidLink"));
                router.push("/sign-in");
            }
        };
        handleRedirect();
    }, [router, tToasts]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error(tToasts("passwordMismatch"));
            return;
        }
        if (password.length < 6) {
            toast.error(tToasts("passwordTooShort"));
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            toast.error(tToasts("resetError", { message: error.message }));
            console.log(error);
        } else {
            toast.success(tToasts("resetSuccess"));
            router.push("/sign-in");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-notion-bg to-notion-bg/80 dark:from-notion-dark-bg dark:to-notion-dark-bg/80 p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white dark:bg-notion-dark-card p-8 rounded-2xl shadow-xl w-full max-w-md border border-notion-gray/20 dark:border-notion-dark-gray/20"
            >
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl font-bold text-notion-text dark:text-notion-dark-text mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-notion-blue to-notion-dark-blue"
                >
                    {t("title")}
                </motion.h1>
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-notion-text dark:text-notion-dark-text mb-2">
                            {t("newPasswordLabel")}
                        </label>
                        <motion.input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            whileFocus={{ borderColor: "#4299E1" }}
                            className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray/30 dark:border-notion-dark-gray/30 rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-all duration-300"
                            placeholder={t("passwordPlaceholder")}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-notion-text dark:text-notion-dark-text mb-2">
                            {t("confirmPasswordLabel")}
                        </label>
                        <motion.input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            whileFocus={{ borderColor: "#4299E1" }}
                            className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray/30 dark:border-notion-dark-gray/30 rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-all duration-300"
                            placeholder={t("passwordPlaceholder")}
                            required
                        />
                    </div>
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white py-3 rounded-xl hover:from-notion-blue/90 hover:to-notion-dark-blue/90 shadow-md transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                        ) : (
                            t("updateButton")
                        )}
                    </motion.button>
                </form>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary"
                >
                    {t("backTo")}{" "}
                    <Link
                        href="/sign-in"
                        className="text-notion-blue dark:text-notion-dark-blue hover:underline font-medium transition-colors duration-200"
                    >
                        {t("signInLink")}
                    </Link>
                </motion.p>
            </motion.div>
        </motion.div>
    );
}