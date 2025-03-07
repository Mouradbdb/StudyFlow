"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg dark:bg-notion-dark-bg p-4">
      <div className="bg-white dark:bg-notion-dark-card p-6 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-notion-text dark:text-notion-dark-text mb-6 text-center">
          Sign In
        </h1>
        <form onSubmit={handleSignIn} className="space-y-4">
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
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-notion-text/70 dark:text-notion-dark-secondary">
          Don’t have an account?{" "}
          <a href="/sign-up" className="text-notion-blue dark:text-notion-dark-blue hover:underline">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}