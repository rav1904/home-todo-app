"use client";

import { useDashboardNav } from "@/components/dashboard/nav-context";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigationPending, setNavigationPending } = useDashboardNav();

  useEffect(() => {
    setNavigationPending(false);
  }, [pathname, searchParams, setNavigationPending]);

  if (!navigationPending) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-emerald-100/80 dark:bg-emerald-950/80"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="h-full w-full animate-pulse bg-emerald-600 dark:bg-emerald-400" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Thin top bar while dashboard nav transitions are pending. */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
