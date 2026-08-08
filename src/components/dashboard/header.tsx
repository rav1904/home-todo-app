"use client";

import { useDashboardNav } from "@/components/dashboard/nav-context";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { Menu } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  email?: string | null;
};

export function DashboardHeader({
  title,
  description,
}: DashboardHeaderProps) {
  const { toggleMobileNav, mobileNavOpen } = useDashboardNav();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200/40 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-stone-800/50 dark:bg-stone-900/80">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="dashboard-sidebar"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 md:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-lg">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 hidden truncate text-xs text-stone-500 sm:block dark:text-stone-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <ThemeMenu />
        <SignOutButton />
      </div>
    </header>
  );
}
