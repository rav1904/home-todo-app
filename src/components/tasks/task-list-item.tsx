"use client";

import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { TaskCancelRestoreButton } from "@/components/tasks/task-cancel-restore-button";
import { TaskCompleteToggle } from "@/components/tasks/task-complete-toggle";
import { TaskSubtaskList } from "@/components/tasks/task-subtask-list";
import { ChecklistPanel } from "@/components/tasks/checklist-toggle";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import {
  CategoryBadge,
} from "@/components/tasks/category-select";
import { LabelBadges } from "@/components/tasks/label-badges";
import {
  PriorityBadge,
} from "@/components/tasks/priority-select";
import { TaskAttribution } from "@/components/tasks/task-attribution";
import { NULL_CATEGORY_DISPLAY } from "@/lib/categories/display";
import type { CategoryDisplay } from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import type { TaskLabelDisplay } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import {
  shouldShowTaskCreator,
  type TaskCreatorProfile,
} from "@/lib/tasks/creators";
import { isoHasExplicitTime } from "@/lib/tasks/due-datetime";
import {
  DEFAULT_TASK_PRIORITY,
  parseTaskPriority,
  type TaskPriority,
} from "@/lib/tasks/priority";
import {
  DEFAULT_TASK_RECURRENCE,
  getRecurrenceBadgeText,
  parseTaskRecurrence,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import { getReminderCardLabel } from "@/lib/tasks/reminder";
import { isFocusDueOverdue } from "@/lib/tasks/focus";
import {
  taskActionButtonClassName,
  taskRowClassName,
} from "@/lib/ui/field-classes";
import {
  getDueDateHistoryLines,
  MOVED_LATER_NUDGE,
  type DueDateHistoryCounts,
} from "@/lib/tasks/due-date-change";
import { getSubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { Bell, ListTodo, Repeat } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TaskListItemProps = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  reminderAt?: string | null;
  reminderMode?: string | null;
  reminderOffsetMinutes?: number | null;
  priority?: TaskPriority | string | null;
  recurrence?: TaskRecurrence | string | null;
  completed: boolean;
  cancelledAt?: string | null;
  createdAt: string;
  categoryId: string | null;
  category: CategoryDisplay | null;
  categoryUnavailable: boolean;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  labelIds: string[];
  taskLabels: TaskLabelDisplay;
  dueDateHistory: DueDateHistoryCounts;
  subtasks?: TaskSubtask[];
  initialEditing?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
  onDeleted?: () => void;
  taskUserId: string;
  currentUserId: string;
  creator?: TaskCreatorProfile | null;
  assignedTo?: string | null;
  assignee?: TaskCreatorProfile | null;
  canDelete?: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDueMeta(value: string) {
  const date = new Date(value);
  if (!isoHasExplicitTime(value)) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function TaskListItem({
  id,
  title,
  description,
  dueAt,
  reminderAt = null,
  reminderMode = null,
  reminderOffsetMinutes = null,
  priority = DEFAULT_TASK_PRIORITY,
  recurrence = DEFAULT_TASK_RECURRENCE,
  completed,
  cancelledAt = null,
  createdAt,
  categoryId,
  category,
  categoryUnavailable,
  categories,
  labels,
  categoryIdsByLabelId = {},
  labelIds,
  taskLabels,
  dueDateHistory,
  subtasks = [],
  initialEditing = false,
  embedded = false,
  onSuccess,
  onDeleted,
  taskUserId,
  currentUserId,
  creator = null,
  assignedTo = null,
  assignee = null,
  canDelete = true,
}: TaskListItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const categoryScope =
    categoryId == null
      ? null
      : (categories.find((entry) => entry.id === categoryId)?.scope ?? null);
  const showCreator = shouldShowTaskCreator({
    taskUserId,
    currentUserId,
    categoryId,
    categoryScope,
  });
  const isCancelled = Boolean(cancelledAt);

  useEffect(() => {
    if (initialEditing) {
      setIsEditing(true);
    }
  }, [initialEditing]);

  useEffect(() => {
    if (!initialEditing) {
      return;
    }

    itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialEditing]);

  const historyLines = getDueDateHistoryLines(dueDateHistory);
  const showMovedLaterNudge = dueDateHistory.movedLaterCount >= 3;
  const subtaskProgress = getSubtaskProgress(subtasks);
  const reminderLabel = getReminderCardLabel(reminderAt, completed, {
    reminderMode,
    reminderOffsetMinutes,
    cancelled: isCancelled,
  });
  const taskPriority = parseTaskPriority(priority);
  const taskRecurrence = parseTaskRecurrence(recurrence);
  const recurrenceBadgeText = getRecurrenceBadgeText(taskRecurrence);
  const dueIsOverdue =
    Boolean(dueAt) && !completed && !isCancelled && isFocusDueOverdue(dueAt!);
  const hasChecklist = subtasks.length > 0;
  const dueHasTime = isoHasExplicitTime(dueAt);
  const workspaceDisplay =
    category ??
    (categoryUnavailable ? null : NULL_CATEGORY_DISPLAY);
  const hasPeople = showCreator || Boolean(assignedTo);
  const hasSecondary =
    isCancelled ||
    taskPriority !== DEFAULT_TASK_PRIORITY ||
    Boolean(reminderLabel) ||
    Boolean(recurrenceBadgeText) ||
    taskLabels.labels.length > 0 ||
    taskLabels.unavailableCount > 0;
  const showMetaRow = hasPeople || Boolean(dueAt) || hasSecondary;

  const wrapperClassName = embedded
    ? ""
    : isCancelled
      ? `${taskRowClassName} opacity-75`
      : taskRowClassName;

  const readContent = (
    <>
      <div className="flex min-w-0 items-start gap-2 overflow-hidden">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          {isCancelled ? (
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-stone-300 text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:border-stone-600 dark:text-stone-500"
              title="Cancelled"
              aria-label="Cancelled"
            >
              —
            </span>
          ) : (
            <TaskCompleteToggle id={id} completed={completed} title={title} />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-start gap-2">
            <CategoryBadge
              category={workspaceDisplay}
              unavailable={categoryUnavailable}
              compact
              className="mt-0.5"
            />
            <h2
              className={`line-clamp-2 min-w-0 flex-1 text-base font-medium leading-snug break-words [overflow-wrap:anywhere] ${
                completed
                  ? "text-stone-400 line-through dark:text-stone-500"
                  : isCancelled
                    ? "text-stone-500 dark:text-stone-400"
                    : "text-stone-900 dark:text-stone-100"
              }`}
              title={title}
            >
              {title}
            </h2>
            {dueAt ? (
              <span
                className={`hidden shrink-0 pt-0.5 text-xs tabular-nums sm:inline ${
                  dueIsOverdue
                    ? "font-medium text-rose-700 dark:text-rose-300"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {dueIsOverdue ? "Overdue · " : ""}
                {formatDueMeta(dueAt)}
                {dueHasTime ? (
                  <span className="sr-only"> (includes time)</span>
                ) : null}
              </span>
            ) : null}
          </div>

          {showMetaRow ? (
            <div
              className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ${
                hasPeople || hasSecondary ? "" : "sm:hidden"
              }`}
            >
              <TaskAttribution
                showAuthor={showCreator}
                authorName={
                  creator?.displayName ?? (showCreator ? "Member" : null)
                }
                creatorId={taskUserId}
                assigneeId={assignedTo}
                assigneeName={assignee?.displayName ?? null}
                currentUserId={currentUserId}
              />
              {dueAt ? (
                <span
                  className={`text-[11px] tabular-nums sm:hidden ${
                    dueIsOverdue
                      ? "font-medium text-rose-700 dark:text-rose-300"
                      : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {dueIsOverdue ? "Overdue · " : ""}
                  {formatDueMeta(dueAt)}
                  {dueHasTime ? (
                    <span className="sr-only"> (includes time)</span>
                  ) : null}
                </span>
              ) : null}
              {isCancelled ? (
                <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                  Cancelled
                </span>
              ) : null}
              <PriorityBadge
                priority={taskPriority}
                hideDefault
                className="!px-1.5 !py-0.5 !text-[11px]"
              />
              {reminderLabel ? (
                <span
                  className={`inline-flex items-center text-stone-400 dark:text-stone-500 ${
                    reminderLabel.overdue
                      ? "text-rose-600 dark:text-rose-300"
                      : ""
                  }`}
                  title={reminderLabel.text}
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">{reminderLabel.text}</span>
                </span>
              ) : null}
              {recurrenceBadgeText ? (
                <span
                  className="inline-flex items-center text-stone-400 dark:text-stone-500"
                  title={recurrenceBadgeText}
                >
                  <Repeat className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">{recurrenceBadgeText}</span>
                </span>
              ) : null}
              <LabelBadges
                labels={taskLabels.labels}
                unavailableCount={taskLabels.unavailableCount}
                maxVisible={2}
              />
            </div>
          ) : null}

          {description ? (
            <p className="line-clamp-2 break-words [overflow-wrap:anywhere] text-sm text-stone-500 dark:text-stone-400">
              {description}
            </p>
          ) : null}

          {historyLines.length > 0 || showMovedLaterNudge ? (
            <div className="hidden space-y-0.5 text-xs break-words text-stone-400 sm:block dark:text-stone-500">
              {historyLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {showMovedLaterNudge ? <p>{MOVED_LATER_NUDGE}</p> : null}
            </div>
          ) : null}

          {hasChecklist && subtaskProgress ? (
            <div className="min-w-0 space-y-2">
              <button
                type="button"
                onClick={() => setChecklistOpen((open) => !open)}
                aria-expanded={checklistOpen}
                aria-label={`Checklist ${subtaskProgress.completedCount} of ${subtaskProgress.totalCount}${checklistOpen ? ", expanded" : ", collapsed"}`}
                className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-200/80 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                <ListTodo className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="tabular-nums">
                  {subtaskProgress.completedCount}/{subtaskProgress.totalCount}
                </span>
              </button>
              <ChecklistPanel open={checklistOpen}>
                <TaskSubtaskList
                  taskId={id}
                  subtasks={subtasks}
                  hideHeading
                  compact
                />
              </ChecklistPanel>
            </div>
          ) : null}

          <p className="sr-only">
            Created {formatDate(createdAt)}
            {dueAt ? `. Due ${formatDateTime(dueAt)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`Edit "${title}"`}
            className={taskActionButtonClassName}
          >
            <PencilIcon />
          </button>
          {!completed ? (
            <TaskCancelRestoreButton
              id={id}
              title={title}
              cancelled={isCancelled}
            />
          ) : null}
          {canDelete ? (
            <TaskDeleteButton
              id={id}
              title={title}
              onDeleted={onDeleted}
              variant="ghost"
            />
          ) : null}
        </div>
      </div>

      <EditTaskModal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        id={id}
        title={title}
        description={description}
        dueAt={dueAt}
        reminderAt={reminderAt}
        reminderMode={reminderMode}
        reminderOffsetMinutes={reminderOffsetMinutes}
        priority={priority}
        recurrence={recurrence}
        completed={completed}
        cancelledAt={cancelledAt}
        categoryId={categoryId}
        categories={categories}
        labels={labels}
        categoryIdsByLabelId={categoryIdsByLabelId}
        labelIds={labelIds}
        subtasks={subtasks}
        taskUserId={taskUserId}
        currentUserId={currentUserId}
        assignedTo={assignedTo}
        canDelete={canDelete}
        onSuccess={onSuccess}
        onDeleted={onDeleted}
      />
    </>
  );

  if (embedded) {
    return (
      <div id={`task-${id}`} className={wrapperClassName}>
        {readContent}
      </div>
    );
  }

  return (
    <li ref={itemRef} id={`task-${id}`} className={wrapperClassName}>
      {readContent}
    </li>
  );
}
