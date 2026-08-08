"use client";

import { useDashboardNav } from "@/components/dashboard/nav-context";
import {
  CalendarDays,
  CheckSquare,
  Crosshair,
  LayoutDashboard,
  Settings,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const baseNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/focus", label: "Focus", icon: Crosshair },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const adminNavItem = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: Shield,
} as const;

type SidebarProps = {
  showAdminLink?: boolean;
};

export function Sidebar({ showAdminLink = false }: SidebarProps) {
  const pathname = usePathname();
  const { mobileNavOpen, closeMobileNav } = useDashboardNav();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const navItems = showAdminLink
    ? [...baseNavItems, adminNavItem]
    : [...baseNavItems];
  const mobileDrawerClosed = isDesktop === false && !mobileNavOpen;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-stone-950/40 transition-opacity md:hidden dark:bg-black/50 ${
          mobileNavOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileNavOpen}
        onClick={closeMobileNav}
      />

      <aside
        id="dashboard-sidebar"
        aria-label="Main navigation"
        aria-hidden={mobileDrawerClosed}
        inert={mobileDrawerClosed ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-stone-200/80 bg-white transition-transform duration-200 ease-out dark:border-stone-800 dark:bg-stone-900 md:static md:z-auto md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } ${mobileDrawerClosed ? "pointer-events-none" : ""}`}
      >
        <div className="flex h-14 items-center justify-between gap-3 border-b border-stone-200/80 px-4 dark:border-stone-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold tracking-tight text-white">
              H
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                Workspace
              </p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                Home tasks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobileNav}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 md:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileNav}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-stone-100"
                }`}
              >
                <Icon
                  className="h-4 w-4 shrink-0 opacity-80"
                  aria-hidden="true"
                  strokeWidth={isActive ? 2.25 : 2}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
