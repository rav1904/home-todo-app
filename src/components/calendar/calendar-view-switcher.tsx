import type { CalendarView } from "@/lib/tasks/calendar-params";
import Link from "next/link";

type CalendarViewSwitcherProps = {
  links: {
    view: CalendarView;
    href: string;
    isActive: boolean;
  }[];
};

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  list: "List",
};

export function CalendarViewSwitcher({ links }: CalendarViewSwitcherProps) {
  return (
    <div className="overflow-x-auto pb-0.5">
      <div
        role="tablist"
        aria-label="Calendar views"
        className="inline-flex min-w-full gap-0.5 rounded-lg border border-stone-200/80 bg-stone-50 p-0.5 sm:min-w-0 dark:border-stone-700/80 dark:bg-stone-800/40"
      >
        {links.map((link) => (
          <Link
            key={link.view}
            href={link.href}
            role="tab"
            aria-selected={link.isActive}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition sm:flex-none ${
              link.isActive
                ? "bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-100"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            }`}
          >
            {VIEW_LABELS[link.view]}
          </Link>
        ))}
      </div>
    </div>
  );
}
