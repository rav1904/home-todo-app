"use client";

import { useDashboardNav } from "@/components/dashboard/nav-context";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import {
  GlobalSearch,
  GlobalSearchButton,
} from "@/components/search/global-search";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { getUserDisplayName } from "@/lib/auth/user-display";
import { createClient } from "@/lib/supabase/client";
import { Home, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [userName, setUserName] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUserName() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        return;
      }

      setUserName(
        getUserDisplayName(user.user_metadata, user.email, "there"),
      );
    }

    void loadUserName();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200/40 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-stone-800/50 dark:bg-stone-900/80">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
          <Link
            href="/dashboard"
            aria-label="Go to home"
            title="Home"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>
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

        <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
          <GlobalSearchButton onClick={() => setSearchOpen(true)} />
          {userName ? (
            <span
              className="mx-1 hidden max-w-[7rem] truncate text-sm text-stone-600 sm:inline sm:max-w-[12rem] dark:text-stone-300"
              title={userName}
            >
              {userName}
            </span>
          ) : null}
          <ThemeMenu />
          <SignOutButton />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
