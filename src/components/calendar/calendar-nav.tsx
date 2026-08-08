import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type CalendarNavProps = {
  nav: CalendarNavLinks;
};

const iconButtonClassName =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200/80 bg-white text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100";

const todayButtonClassName =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-stone-200/80 bg-white px-3 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100";

export function CalendarNav({ nav }: CalendarNavProps) {
  const showPrevNext = nav.prevHref !== null && nav.nextHref !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {showPrevNext ? (
          <Link
            href={nav.prevHref!}
            className={iconButtonClassName}
            aria-label="Previous period"
            title="Previous period"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}

        <h2 className="min-w-0 truncate px-1.5 text-base font-semibold tracking-tight text-stone-900 sm:text-lg dark:text-stone-100">
          {nav.title}
        </h2>

        {showPrevNext ? (
          <Link
            href={nav.nextHref!}
            className={iconButtonClassName}
            aria-label="Next period"
            title="Next period"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {nav.todayHref ? (
        <Link href={nav.todayHref} className={todayButtonClassName}>
          Today
        </Link>
      ) : null}
    </div>
  );
}
