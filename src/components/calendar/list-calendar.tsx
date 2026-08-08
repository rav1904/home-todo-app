import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { formatDayLabel } from "@/lib/tasks/local-dates";
import Link from "next/link";

type ListCalendarProps = {
  nav: CalendarNavLinks;
  overdue: CalendarTask[];
  upcomingByDay: Record<string, CalendarTask[]>;
  upcomingDayKeys: string[];
  onTaskSelect?: (taskId: string) => void;
};

export function ListCalendar({
  nav,
  overdue,
  upcomingByDay,
  upcomingDayKeys,
  onTaskSelect,
}: ListCalendarProps) {
  const isEmpty = overdue.length === 0 && upcomingDayKeys.length === 0;

  return (
    <div className="space-y-3">
      <CalendarNav nav={nav} />

      {isEmpty ? (
        <div className={`${cardClassName} px-4 py-10 text-center`}>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
            No dated tasks in range
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
            Overdue and upcoming tasks with due dates in the next 90 days show
            up here.
          </p>
          <Link
            href="/dashboard/tasks"
            className="mt-4 inline-flex text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Browse tasks
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {overdue.length > 0 ? (
            <section className={`${cardClassName} p-3 sm:p-4`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Overdue
                </h3>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium tabular-nums text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {overdue.length}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {overdue.map((task) => (
                  <li key={task.id}>
                    <CalendarTaskChip task={task} onTaskSelect={onTaskSelect} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {upcomingDayKeys.map((dayKey) => {
            const dayTasks = upcomingByDay[dayKey] ?? [];

            return (
              <section
                key={dayKey}
                id={`calendar-day-${dayKey}`}
                className={`${cardClassName} p-3 sm:p-4`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {formatDayLabel(dayKey)}
                  </h3>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {dayTasks.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {dayTasks.map((task) => (
                    <li key={task.id}>
                      <CalendarTaskChip
                        task={task}
                        onTaskSelect={onTaskSelect}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
