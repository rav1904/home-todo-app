import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";

type DayCalendarProps = {
  nav: CalendarNavLinks;
  tasks: CalendarTask[];
  onTaskSelect?: (taskId: string) => void;
};

export function DayCalendar({ nav, tasks, onTaskSelect }: DayCalendarProps) {
  return (
    <div className="space-y-4">
      <CalendarNav nav={nav} />

      <section className={`${cardClassName} p-4 sm:p-5`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No tasks due on this day.
          </p>
        ) : (
          <ul className="space-y-2">
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
