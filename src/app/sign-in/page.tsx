"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      console.log(error);
    } else {
      toast.success("Signed in successfully!");
      router.push("/planner");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (error) {
      toast.error(error.message);
      console.log(error);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setShowResetModal(false);
      setResetEmail("");
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
          Sign In
        </motion.h1>
        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-notion-text dark:text-notion-dark-text mb-2">
              Email
            </label>
            <motion.input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              whileFocus={{ borderColor: "#4299E1" }}
              className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray/30 dark:border-notion-dark-gray/30 rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-all duration-300"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-notion-text dark:text-notion-dark-text mb-2">
              Password
            </label>
            <motion.input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              whileFocus={{ borderColor: "#4299E1" }}
              className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray/30 dark:border-notion-dark-gray/30 rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-all duration-300"
              placeholder="••••••••"
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
              "Sign In"
            )}
          </motion.button>
        </form>
        <div className="mt-4 text-center">
          <motion.button
            onClick={() => setShowResetModal(true)}
            whileHover={{ scale: 1.05 }}
            className="text-sm text-notion-blue dark:text-notion-dark-blue hover:underline font-medium transition-colors duration-200"
          >
            Forgot Password?
          </motion.button>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary"
        >
          Don’t have an account?{" "}
          <a
            href="/sign-up"
            className="text-notion-blue dark:text-notion-dark-blue hover:underline font-medium transition-colors duration-200"
          >
            Sign Up
          </a>
        </motion.p>
      </motion.div>

      {showResetModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-notion-dark-card p-6 rounded-2xl shadow-xl w-full max-w-sm border border-notion-gray/20 dark:border-notion-dark-gray/20"
          >
            <h2 className="text-xl font-bold text-notion-text dark:text-notion-dark-text mb-4">
              Reset Password
            </h2>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-notion-text dark:text-notion-dark-text mb-2">
                  Email
                </label>
                <motion.input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  whileFocus={{ borderColor: "#4299E1" }}
                  className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray/30 dark:border-notion-dark-gray/30 rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text transition-all duration-300"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="flex gap-4">
                <motion.button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-2 bg-notion-gray dark:bg-notion-dark-gray text-notion-text dark:text-notion-dark-text rounded-lg hover:bg-notion-gray/90 dark:hover:bg-notion-dark-gray/90 transition-all duration-300"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={resetLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 bg-gradient-to-r from-notion-blue to-notion-dark-blue text-white py-2 rounded-lg hover:from-notion-blue/90 hover:to-notion-dark-blue/90 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    "Send Reset Link"
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}