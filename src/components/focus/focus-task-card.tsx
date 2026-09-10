"use client";

import { CategoryBadge } from "@/components/tasks/category-select";
import { TaskAttribution } from "@/components/tasks/task-attribution";
import { TaskPriorityIcon } from "@/components/tasks/task-priority-icon";
import { isFocusDueOverdue } from "@/lib/tasks/focus";
import { formatHomeDueDate } from "@/lib/tasks/local-dates";
import {
  getRecurrenceBadgeText,
  parseTaskRecurrence,
} from "@/lib/tasks/recurrence";
import { getReminderCardLabel } from "@/lib/tasks/reminder";
import { Bell, ListTodo, Repeat } from "lucide-react";

export type FocusTaskCardProps = {
  title: string;
  dueAt: string | null;
  priority?: string | null;
  reminderAt?: string | null;
  reminderMode?: string | null;
  reminderOffsetMinutes?: number | null;
  recurrence?: string | null;
  category: {
    label: string;
    name?: string;
    colour: string;
    icon_name: string;
  } | null;
  categoryUnavailable: boolean;
  showCategory: boolean;
  showAuthor: boolean;
  authorName: string | null;
  creatorId: string;
  assignedTo: string | null;
  assigneeName: string | null;
  currentUserId: string;
  checklist: { completedCount: number; totalCount: number } | null;
  onClick: () => void;
};

export function FocusTaskCard({
  title,
  dueAt,
  priority,
  reminderAt = null,
  reminderMode = null,
  reminderOffsetMinutes = null,
  recurrence = null,
  category,
  categoryUnavailable,
  showCategory,
  showAuthor,
  authorName,
  creatorId,
  assignedTo,
  assigneeName,
  currentUserId,
  checklist,
  onClick,
}: FocusTaskCardProps) {
  const dueOverdue = Boolean(dueAt) && isFocusDueOverdue(dueAt!);
  const dueLabel = dueAt ? formatHomeDueDate(dueAt) : null;
  const reminderLabel = getReminderCardLabel(reminderAt, false, {
    reminderMode,
    reminderOffsetMinutes,
  });
  const recurrenceText = getRecurrenceBadgeText(parseTaskRecurrence(recurrence));
  const showCategoryChip = showCategory && (category !== null || categoryUnavailable);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-w-0 cursor-pointer rounded-lg border border-stone-200/80 bg-white px-2.5 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50/80 dark:border-stone-700/80 dark:bg-stone-900 dark:hover:border-stone-600 dark:hover:bg-stone-800/60"
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <p
          className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug break-words [overflow-wrap:anywhere] text-stone-900 dark:text-stone-100"
          title={title}
        >
          {title}
        </p>
        <TaskPriorityIcon priority={priority} />
      </div>

      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {dueLabel ? (
          <span
            className={`text-[11px] tabular-nums ${
              dueOverdue
                ? "font-medium text-rose-700 dark:text-rose-300"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {dueLabel}
          </span>
        ) : null}
        {reminderLabel ? (
          <span
            className={`inline-flex items-center ${
              reminderLabel.overdue
                ? "text-rose-600 dark:text-rose-300"
                : "text-stone-400 dark:text-stone-500"
            }`}
            title={reminderLabel.text}
          >
            <Bell className="h-3 w-3" aria-hidden />
            <span className="sr-only">{reminderLabel.text}</span>
          </span>
        ) : null}
        {recurrenceText ? (
          <span
            className="inline-flex items-center text-stone-400 dark:text-stone-500"
            title={recurrenceText}
          >
            <Repeat className="h-3 w-3" aria-hidden />
            <span className="sr-only">{recurrenceText}</span>
          </span>
        ) : null}
        {checklist ? (
          <span
            className="inline-flex items-center gap-0.5 text-[11px] tabular-nums text-stone-400 dark:text-stone-500"
            title={`Checklist ${checklist.completedCount} of ${checklist.totalCount}`}
          >
            <ListTodo className="h-3 w-3" aria-hidden />
            {checklist.completedCount}/{checklist.totalCount}
          </span>
        ) : null}
      </div>

      {showCategoryChip ? (
        <div className="mt-1.5 min-w-0">
          <CategoryBadge
            category={category}
            unavailable={categoryUnavailable}
            compact
            muted
          />
        </div>
      ) : null}

      <TaskAttribution
        className="mt-1.5"
        showAuthor={showAuthor}
        authorName={authorName}
        creatorId={creatorId}
        assigneeId={assignedTo}
        assigneeName={assigneeName}
        currentUserId={currentUserId}
      />
    </button>
  );
}
