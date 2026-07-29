import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import Link from "next/link";

type CalendarNavProps = {
  nav: CalendarNavLinks;
};

const navButtonClassName =
  "cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700";

export function CalendarNav({ nav }: CalendarNavProps) {
  const showPrevNext = nav.prevHref !== null && nav.nextHref !== null;
  const showNavButtons = showPrevNext || nav.todayHref !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
        {nav.title}
      </h2>
      {showNavButtons ? (
        <div className="flex flex-wrap items-center gap-2">
          {showPrevNext ? (
            <>
              <Link href={nav.prevHref!} className={navButtonClassName}>
                Previous
              </Link>
              {nav.todayHref ? (
                <Link href={nav.todayHref} className={navButtonClassName}>
                  Today
                </Link>
              ) : null}
              <Link href={nav.nextHref!} className={navButtonClassName}>
                Next
              </Link>
            </>
          ) : nav.todayHref ? (
            <Link href={nav.todayHref} className={navButtonClassName}>
              Today
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
