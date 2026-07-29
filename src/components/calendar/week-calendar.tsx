import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import type { CalendarDayCell, CalendarTask } from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { formatShortDayLabel } from "@/lib/tasks/local-dates";

type WeekCalendarProps = {
  nav: CalendarNavLinks;
  days: CalendarDayCell[];
  tasksByDay: Record<string, CalendarTask[]>;
  onTaskSelect?: (taskId: string) => void;
};

function WeekDayColumn({
  day,
  tasks,
  onTaskSelect,
}: {
  day: CalendarDayCell;
  tasks: CalendarTask[];
  onTaskSelect?: (taskId: string) => void;
}) {
  return (
    <section className="border-b border-stone-200 p-3 last:border-b-0 lg:border-b-0 lg:p-4 dark:border-stone-700">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
            day.isToday
              ? "bg-emerald-600 text-white"
              : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          }`}
        >
          {day.dayNumber}
        </span>
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {formatShortDayLabel(day.dayKey)}
        </h3>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-stone-400 dark:text-stone-500">No tasks</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li key={task.id}>
              <CalendarTaskChip
                task={task}
                compact
                onTaskSelect={onTaskSelect}
              />
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
    <div className="space-y-4">
      <CalendarNav nav={nav} />

      <div className={`${cardClassName} overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-7 lg:divide-x lg:divide-stone-200 dark:lg:divide-stone-700">
          {days.map((day) => (
            <WeekDayColumn
              key={day.dayKey}
              day={day}
              tasks={tasksByDay[day.dayKey] ?? []}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
