"use client";

import { GoogleGIcon } from "@/components/brand/google-g-icon";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoadingButton } from "@/components/ui/loading-button";
import { createClient } from "@/lib/supabase/client";
import { useRef, useState } from "react";

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function handleGoogleSignIn() {
    if (inFlightRef.current || loading) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white">
          H
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          Work Hard / Play Hard
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          a lifestyle Task Management application
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <LoadingButton
          type="button"
          onClick={handleGoogleSignIn}
          loading={loading}
          showSpinner
          aria-label={
            loading ? "Signing in with Google" : "Continue with Google"
          }
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 dark:focus-visible:ring-stone-500/40 dark:focus-visible:ring-offset-stone-900"
          idleLabel={
            <>
              <GoogleGIcon className="h-5 w-5 shrink-0" />
              <span>Continue with Google</span>
            </>
          }
          loadingLabel={<span>Signing in…</span>}
        />

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-center">
        <ThemeToggle />
      </div>

      <p className="mt-4 text-center text-xs text-stone-400 dark:text-stone-500">
        Access by invitation only. Login to request access.
      </p>
    </div>
  );
}
