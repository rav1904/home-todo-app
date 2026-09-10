import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarDayCell, CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { formatWeekDayHeading } from "@/lib/tasks/local-dates";

type WeekCalendarProps = {
  nav: CalendarNavLinks;
  days: CalendarDayCell[];
  tasksByDay: Record<string, CalendarTask[]>;
  onTaskSelect?: (taskId: string) => void;
};

function WeekDaySection({
  day,
  tasks,
  onTaskSelect,
}: {
  day: CalendarDayCell;
  tasks: CalendarTask[];
  onTaskSelect?: (taskId: string) => void;
}) {
  return (
    <section
      className={`${cardClassName} p-3 sm:p-4 ${
        day.isToday ? "ring-1 ring-emerald-500/30 dark:ring-emerald-400/25" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        {formatWeekDayHeading(day.dayKey)}
        {day.isToday ? (
          <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Today
          </span>
        ) : null}
      </h3>

      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-stone-400 dark:text-stone-500">
          No tasks
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <CalendarTaskChip task={task} onTaskSelect={onTaskSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WeekCalendar({
  nav,
  days,
  tasksByDay,
  onTaskSelect,
}: WeekCalendarProps) {
  return (
    <div className="min-w-0 space-y-3">
      <CalendarNav nav={nav} />

      <div className="min-w-0 space-y-2.5">
        {days.map((day) => (
          <WeekDaySection
            key={day.dayKey}
            day={day}
            tasks={tasksByDay[day.dayKey] ?? []}
            onTaskSelect={onTaskSelect}
          />
        ))}
      </div>
    </div>
  );
}
