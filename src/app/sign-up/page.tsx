"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed up successfully! Check your email to confirm.");
      router.push("/planner");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg dark:bg-notion-dark-bg p-4">
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-notion-text dark:text-notion-dark-text mb-6 text-center">
          Sign Up
        </h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm sm:text-base text-notion-text dark:text-notion-dark-text mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm sm:text-base text-notion-text dark:text-notion-dark-text mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-notion-bg dark:bg-notion-dark-bg border border-notion-gray dark:border-notion-dark-gray rounded-lg focus:ring-2 focus:ring-notion-blue dark:focus:ring-notion-dark-blue focus:outline-none text-notion-text dark:text-notion-dark-text"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-notion-blue dark:bg-notion-dark-blue text-white py-3 rounded-lg hover:bg-notion-blue/90 dark:hover:bg-notion-dark-blue/90 hover:shadow-md transition-all duration-300 font-semibold text-sm sm:text-base disabled:opacity-50"
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary">
          Already have an account?{" "}
          <a href="/sign-in" className="text-notion-blue dark:text-notion-dark-blue hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}