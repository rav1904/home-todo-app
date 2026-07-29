import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { formatDayLabel } from "@/lib/tasks/local-dates";

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
    <div className="space-y-4">
      <CalendarNav nav={nav} />

      {isEmpty ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No overdue or upcoming tasks with due dates in the next 90 days.
        </p>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 ? (
            <section className={`${cardClassName} p-4 sm:p-5`}>
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
                Overdue
              </h3>
              <ul className="mt-3 space-y-2">
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
                className={`${cardClassName} p-4 sm:p-5`}
              >
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {formatDayLabel(dayKey)}
                </h3>
                <ul className="mt-3 space-y-2">
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
