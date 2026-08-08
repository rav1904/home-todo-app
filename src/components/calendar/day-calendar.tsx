import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import Link from "next/link";

type DayCalendarProps = {
  nav: CalendarNavLinks;
  tasks: CalendarTask[];
  onTaskSelect?: (taskId: string) => void;
};

export function DayCalendar({ nav, tasks, onTaskSelect }: DayCalendarProps) {
  return (
    <div className="space-y-3">
      <CalendarNav nav={nav} />

      <section className={`${cardClassName} p-3 sm:p-4`}>
        {tasks.length === 0 ? (
          <div className="px-1 py-8 text-center">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Nothing due this day
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Tasks appear here when they have a due date on this day.
            </p>
            <Link
              href="/dashboard/tasks"
              className="mt-4 inline-flex text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Browse tasks
            </Link>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id}>
                <CalendarTaskChip task={task} onTaskSelect={onTaskSelect} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
