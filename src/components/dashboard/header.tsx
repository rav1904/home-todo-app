"use client";

import { useDashboardNav } from "@/components/dashboard/nav-context";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeMenu } from "@/components/theme/theme-menu";
import { Menu } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  email?: string | null;
  avatarUrl?: string | null;
  avatarName?: string | null;
};

export function DashboardHeader({
  title,
  description,
  email,
  avatarUrl,
  avatarName,
}: DashboardHeaderProps) {
  const { toggleMobileNav, mobileNavOpen } = useDashboardNav();
  const showAvatar = Boolean(avatarName);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-stone-800 dark:bg-stone-900/95">
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="dashboard-sidebar"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 md:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
        {showAvatar ? (
          <div className="mt-0.5 shrink-0">
            <UserAvatar name={avatarName!} avatarUrl={avatarUrl} size="md" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1
            className={
              showAvatar
                ? "truncate text-lg font-medium tracking-tight text-stone-800 dark:text-stone-100 sm:text-xl"
                : "truncate text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {email ? (
          <span className="mr-1 hidden max-w-[14rem] truncate rounded-md bg-stone-100 px-2.5 py-1 text-xs text-stone-600 sm:inline dark:bg-stone-800 dark:text-stone-300">
            {email}
          </span>
        ) : null}
        <ThemeMenu />
        <SignOutButton />
      </div>
    </header>
  );
}
