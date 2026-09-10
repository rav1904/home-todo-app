"use client";

import type { CalendarView } from "@/lib/tasks/calendar-params";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent } from "react";

type ViewSwitcherLink = {
  view: CalendarView;
  href: string;
  isActive: boolean;
};

type CalendarViewSwitcherProps = {
  links: ViewSwitcherLink[];
};

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  list: "List",
};

export function CalendarViewSwitcher({ links }: CalendarViewSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<CalendarView | null>(null);
  const activeView = links.find((link) => link.isActive)?.view ?? null;
  const switching = pendingView !== null || isPending;

  useEffect(() => {
    if (pendingView && pendingView === activeView) {
      setPendingView(null);
    }
  }, [activeView, pendingView]);

  function handleClick(
    event: MouseEvent<HTMLAnchorElement>,
    link: ViewSwitcherLink,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (link.isActive && pendingView === null) {
      event.preventDefault();
      return;
    }

    if (pendingView !== null && pendingView !== link.view) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setPendingView(link.view);
    startTransition(() => {
      router.push(link.href);
    });
  }

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Calendar views"
        aria-busy={switching || undefined}
        className="flex w-full min-w-0 rounded-lg border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900"
      >
        {links.map((link) => {
          const selected = pendingView
            ? link.view === pendingView
            : link.isActive;
          const tabDisabled = pendingView !== null && link.view !== pendingView;

          return (
            <Link
              key={link.view}
              href={link.href}
              role="tab"
              aria-selected={selected}
              aria-current={selected ? "page" : undefined}
              aria-disabled={tabDisabled || undefined}
              onClick={(event) => handleClick(event, link)}
              className={`inline-flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
                selected
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              } ${tabDisabled ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="truncate">{VIEW_LABELS[link.view]}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 h-0.5 overflow-hidden rounded-full">
        {switching ? (
          <div
            className="h-full w-full animate-pulse bg-emerald-600 dark:bg-emerald-400"
            role="status"
            aria-live="polite"
            aria-label="Loading calendar view"
          >
            <span className="sr-only">Loading…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
