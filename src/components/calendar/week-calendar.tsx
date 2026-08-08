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
    <section
      className={`flex min-h-[12rem] w-[9.75rem] shrink-0 snap-start flex-col border-r border-stone-200/80 p-2.5 last:border-r-0 sm:w-[11rem] lg:min-h-[16rem] lg:w-auto lg:min-w-0 lg:p-3 dark:border-stone-700/80 ${
        day.isToday ? "bg-emerald-50/35 dark:bg-emerald-950/15" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
            day.isToday
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
              : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
          }`}
        >
          {day.dayNumber}
        </span>
        <h3 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
          {formatShortDayLabel(day.dayKey)}
        </h3>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-stone-400 dark:text-stone-500">No tasks</p>
      ) : (
        <ul className="space-y-1">
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
    <div className="space-y-3">
      <CalendarNav nav={nav} />

      <div className={`${cardClassName} overflow-hidden`}>
        <div className="-mx-px flex snap-x snap-mandatory overflow-x-auto lg:grid lg:snap-none lg:grid-cols-7 lg:overflow-visible">
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
