"use client";

import { CalendarTaskChip } from "@/components/calendar/calendar-task-chip";
import { cardClassName } from "@/lib/ui/field-classes";
import {
  CALENDAR_VISIBLE_TASK_LIMIT,
  type CalendarDayCell,
  type CalendarTask,
} from "@/lib/tasks/calendar";
import { formatShortWeekday } from "@/lib/tasks/local-dates";
import Link from "next/link";
import { useState } from "react";

type MonthCalendarProps = {
  monthLabel: string;
  prevMonthHref: string;
  nextMonthHref: string;
  todayHref: string;
  days: CalendarDayCell[];
  tasksByDay: Record<string, CalendarTask[]>;
};

function formatExpandedDayLabel(dayKey: string) {
  const [yearPart, monthPart, dayPart] = dayKey.split("-").map(Number);
  return new Date(yearPart, monthPart - 1, dayPart).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    },
  );
}

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2024, 0, 1 + index);
  return formatShortWeekday(date).slice(0, 3);
});

export function MonthCalendar({
  monthLabel,
  prevMonthHref,
  nextMonthHref,
  todayHref,
  days,
  tasksByDay,
}: MonthCalendarProps) {
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  function toggleDay(dayKey: string) {
    setExpandedDayKey((current) => (current === dayKey ? null : dayKey));
  }

  const expandedTasks = expandedDayKey ? (tasksByDay[expandedDayKey] ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          {monthLabel}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={prevMonthHref}
            className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Previous
          </Link>
          <Link
            href={todayHref}
            className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Today
          </Link>
          <Link
            href={nextMonthHref}
            className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Next
          </Link>
        </div>
      </div>

      <div className={`${cardClassName} overflow-hidden`}>
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:px-2 sm:text-xs dark:text-stone-400"
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
            const isExpanded = expandedDayKey === day.dayKey;

            return (
              <div
                key={day.dayKey}
                className={`min-h-[5.5rem] border-b border-r border-stone-200 p-1 sm:min-h-[7rem] sm:p-1.5 dark:border-stone-700 ${
                  day.isCurrentMonth
                    ? "bg-white dark:bg-stone-900"
                    : "bg-stone-50/80 dark:bg-stone-900/40"
                } ${isExpanded ? "ring-2 ring-inset ring-emerald-500/40" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (dayTasks.length > 0) {
                      toggleDay(day.dayKey);
                    }
                  }}
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition ${
                    day.isToday
                      ? "bg-emerald-600 text-white"
                      : day.isCurrentMonth
                        ? "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                        : "text-stone-400 dark:text-stone-500"
                  } ${dayTasks.length > 0 ? "cursor-pointer" : "cursor-default"}`}
                  aria-label={
                    dayTasks.length > 0
                      ? `Show ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"} for day ${day.dayNumber}`
                      : `Day ${day.dayNumber}`
                  }
                  aria-expanded={isExpanded}
                >
                  {day.dayNumber}
                </button>

                <div className="space-y-1">
                  {visibleTasks.map((task) => (
                    <CalendarTaskChip key={task.id} task={task} compact />
                  ))}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleDay(day.dayKey)}
                      className="w-full cursor-pointer rounded-md px-1 py-0.5 text-left text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-50 sm:text-[11px] dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    >
                      +{hiddenCount} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {expandedDayKey && expandedTasks.length > 0 ? (
        <section className={`${cardClassName} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Tasks for {formatExpandedDayLabel(expandedDayKey)}
            </h3>
            <button
              type="button"
              onClick={() => setExpandedDayKey(null)}
              className="cursor-pointer text-xs font-medium text-stone-500 transition hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Close
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {expandedTasks.map((task) => (
              <li key={task.id}>
                <CalendarTaskChip task={task} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
