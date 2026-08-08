"use client";

import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { cardClassName } from "@/lib/ui/field-classes";
import {
  CALENDAR_VISIBLE_TASK_LIMIT,
  type CalendarDayCell,
  type CalendarTask,
} from "@/lib/tasks/calendar";
import type { CalendarNavLinks } from "@/lib/tasks/calendar-params";
import { formatShortWeekday } from "@/lib/tasks/local-dates";
import { useRouter } from "next/navigation";

type MonthCalendarProps = {
  nav: CalendarNavLinks;
  days: CalendarDayCell[];
  tasksByDay: Record<string, CalendarTask[]>;
  onTaskSelect?: (taskId: string) => void;
};

function formatDayViewLabel(dayKey: string) {
  const [yearPart, monthPart, dayPart] = dayKey.split("-").map(Number);
  return new Date(yearPart, monthPart - 1, dayPart).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function dayViewHref(dayKey: string) {
  return `/dashboard/calendar?view=day&date=${dayKey}`;
}

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2024, 0, 1 + index);
  return formatShortWeekday(date).slice(0, 3);
});

export function MonthCalendar({
  nav,
  days,
  tasksByDay,
  onTaskSelect,
}: MonthCalendarProps) {
  const router = useRouter();

  function openDayView(dayKey: string) {
    router.push(dayViewHref(dayKey));
  }

  return (
    <div className="space-y-3">
      <CalendarNav nav={nav} />

      <div className={`${cardClassName} overflow-hidden`}>
        <div className="grid grid-cols-7 border-b border-stone-200/80 bg-stone-50/80 dark:border-stone-700/80 dark:bg-stone-800/40">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-0.5 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:px-1 sm:text-xs dark:text-stone-400"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayTasks = tasksByDay[day.dayKey] ?? [];
            const visibleTasks = dayTasks.slice(0, CALENDAR_VISIBLE_TASK_LIMIT);
            const hiddenCount = dayTasks.length - visibleTasks.length;
            const dayLabel = formatDayViewLabel(day.dayKey);
            const openLabel = `Open day view for ${dayLabel}`;

            return (
              <div
                key={day.dayKey}
                role="link"
                tabIndex={0}
                title={openLabel}
                aria-label={openLabel}
                onClick={() => openDayView(day.dayKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDayView(day.dayKey);
                  }
                }}
                className={`min-h-[4.75rem] cursor-pointer border-b border-r border-stone-200/80 p-0.5 transition hover:bg-stone-100/90 sm:min-h-[6.5rem] sm:p-1 dark:border-stone-700/80 dark:hover:bg-stone-800/70 ${
                  day.isCurrentMonth
                    ? day.isToday
                      ? "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35"
                      : "bg-white dark:bg-stone-900"
                    : "bg-stone-50/70 dark:bg-stone-950/40"
                }`}
              >
                <span
                  className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    day.isToday
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                      : day.isCurrentMonth
                        ? "text-stone-700 dark:text-stone-300"
                        : "text-stone-400 dark:text-stone-600"
                  }`}
                >
                  {day.dayNumber}
                </span>

                <div className="space-y-0.5">
                  {visibleTasks.map((task) => (
                    <CalendarTaskChip
                      key={task.id}
                      task={task}
                      compact
                      onTaskSelect={onTaskSelect}
                    />
                  ))}
                  {hiddenCount > 0 ? (
                    <span className="block px-1 py-0.5 text-left text-[10px] font-medium text-emerald-700 sm:text-[11px] dark:text-emerald-400">
                      +{hiddenCount} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
