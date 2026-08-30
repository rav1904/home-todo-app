"use client";

import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  async function handleSignOut() {
    if (inFlightRef.current || loading) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-busy={loading || undefined}
      aria-label={loading ? "Signing out" : "Sign out"}
      title={loading ? "Signing out…" : "Sign out"}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
