"use client";

import { createClient } from "@midpoker/supabase/client";
import { Icons } from "@midpoker/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  showLastUsed?: boolean;
};

export function EmailSignIn({ showLastUsed = false }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback${returnTo ? `?return_to=${returnTo}` : ""}`,
          },
        });

        if (error) throw error;

        setError(
          "Check your email for a confirmation link to complete signup.",
        );
        return;
      }

      // Use hard redirect to ensure cookies are properly sent to server
      // router.push() does client-side navigation which may not send new cookies
      const redirectUrl = returnTo || "/";
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors placeholder:text-white/60 dark:placeholder:text-[#70707080] focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-[#0e0e0e]/20"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors placeholder:text-white/60 dark:placeholder:text-[#70707080] focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-[#0e0e0e]/20"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-6 py-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Email size={16} />
            <span>
              {isLoading
                ? "Loading..."
                : mode === "signin"
                  ? "Sign in with Email"
                  : "Sign up with Email"}
            </span>
          </div>
          {showLastUsed && (
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
              <span className="font-sans text-sm text-white/60 dark:text-[#70707080]">
                Last used
              </span>
            </div>
          )}
        </button>

        {error && (
          <p
            className={`text-sm font-sans ${error.includes("Check your email") ? "text-green-500" : "text-red-500"}`}
          >
            {error}
          </p>
        )}
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="w-full text-sm font-sans text-[#878787] hover:text-foreground transition-colors"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
