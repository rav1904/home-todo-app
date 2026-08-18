"use client";

import type { CalendarTask } from "@/lib/tasks/calendar";
import { formatTaskTimeLabel } from "@/lib/tasks/local-dates";
import { getPriorityChipDotClassName } from "@/lib/tasks/priority";
import { DEFAULT_TASK_RECURRENCE } from "@/lib/tasks/recurrence";
import { Bell, Repeat } from "lucide-react";

type CalendarTaskChipProps = {
  task: CalendarTask;
  compact?: boolean;
  onTaskSelect?: (taskId: string) => void;
};

const FALLBACK_RAIL = "#a8a29e";

export function CalendarTaskChip({
  task,
  compact = false,
  onTaskSelect,
}: CalendarTaskChipProps) {
  const priorityDotClass = getPriorityChipDotClassName(task.priority);
  const categoryColour = task.category?.colour ?? FALLBACK_RAIL;
  const isRecurring = task.recurrence !== DEFAULT_TASK_RECURRENCE;
  const hasReminder = Boolean(task.reminderAt) && !task.completed;
  const timeLabel = formatTaskTimeLabel(task.dueAt);

  const ariaBits = [
    task.title,
    timeLabel,
    task.completed ? "completed" : null,
    isRecurring ? "repeats" : null,
    hasReminder ? "has reminder" : null,
    task.priority === "high" || task.priority === "urgent"
      ? `${task.priority} priority`
      : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onTaskSelect?.(task.id);
      }}
      aria-label={ariaBits.join(", ")}
      className={`group flex w-full cursor-pointer overflow-hidden rounded-md text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
        compact
          ? "bg-stone-100/90 hover:bg-emerald-50 dark:bg-stone-800/70 dark:hover:bg-emerald-950/40"
          : "bg-stone-50 hover:bg-emerald-50/80 dark:bg-stone-800/60 dark:hover:bg-emerald-950/30"
      } ${task.completed ? "opacity-60" : ""}`}
    >
      <span
        className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: categoryColour }}
        aria-hidden="true"
      />
      <span
        className={`flex min-w-0 flex-1 items-center gap-1 ${
          compact ? "px-1.5 py-0.5" : "px-2 py-1.5"
        }`}
      >
        {priorityDotClass ? (
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${priorityDotClass}`}
            aria-hidden="true"
          />
        ) : null}
        <span
          className={`min-w-0 flex-1 truncate font-medium leading-tight text-stone-900 dark:text-stone-100 ${
            compact ? "text-[11px] sm:text-xs" : "text-sm"
          } ${task.completed ? "text-stone-400 line-through dark:text-stone-500" : ""}`}
        >
          {task.title}
        </span>
        {isRecurring ? (
          <Repeat
            className="h-3 w-3 shrink-0 text-sky-600/80 dark:text-sky-400/80"
            aria-hidden="true"
            strokeWidth={2.25}
          />
        ) : null}
        {hasReminder ? (
          <Bell
            className="h-3 w-3 shrink-0 text-amber-600/80 dark:text-amber-400/80"
            aria-hidden="true"
            strokeWidth={2.25}
          />
        ) : null}
        {timeLabel ? (
          <span
            className={`shrink-0 tabular-nums text-stone-500 dark:text-stone-400 ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            {timeLabel}
          </span>
        ) : null}
        {!compact && task.subtaskProgress ? (
          <span className="hidden shrink-0 text-[10px] text-stone-400 sm:inline dark:text-stone-500">
            {task.subtaskProgress.completedCount}/
            {task.subtaskProgress.totalCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}
