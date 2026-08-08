"use client";

import { TaskCompleteToggle } from "@/components/tasks/task-complete-toggle";
import { TaskSubtaskList } from "@/components/tasks/task-subtask-list";
import { TaskSubtaskProgress } from "@/components/tasks/task-subtask-progress";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import {
  CategoryBadge,
  CategorySelect,
} from "@/components/tasks/category-select";
import { LabelBadges } from "@/components/tasks/label-badges";
import { LabelSelect } from "@/components/tasks/label-select";
import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import { ReminderFields } from "@/components/tasks/reminder-fields";
import {
  PriorityBadge,
  PrioritySelect,
} from "@/components/tasks/priority-select";
import { RecurrenceSelect } from "@/components/tasks/recurrence-select";
import type { CategoryDisplay } from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import type { TaskLabelDisplay } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import {
  completeTaskWithRecurrence,
} from "@/lib/tasks/complete-with-recurrence";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from "@/lib/tasks/due-datetime";
import {
  DEFAULT_TASK_PRIORITY,
  parseTaskPriority,
  type TaskPriority,
} from "@/lib/tasks/priority";
import {
  DEFAULT_TASK_RECURRENCE,
  getRecurrenceBadgeText,
  parseTaskRecurrence,
  RECURRENCE_NEXT_OCCURRENCE_HINT,
  validateRecurrenceDueAt,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import {
  getReminderCardLabel,
  reminderFormFromDb,
  syncReminderFormWithDueLocal,
  toReminderDbColumns,
  type ReminderFormState,
} from "@/lib/tasks/reminder";
import { cardClassName, fieldClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import {
  dueAtValuesEqual,
  getChangeDirection,
  getDueDateHistoryLines,
  MOVED_LATER_NUDGE,
  type DueDateHistoryCounts,
} from "@/lib/tasks/due-date-change";
import { getSubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
}: TaskListItemProps) {
  const router = useRouter();
  const itemRef = useRef<HTMLLIElement>(null);
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editDueAt, setEditDueAt] = useState(isoToDatetimeLocalValue(dueAt));
  const [editReminder, setEditReminder] = useState<ReminderFormState>(() =>
    reminderFormFromDb({
      reminderAt,
      reminderMode,
      reminderOffsetMinutes,
    }),
  );
  const [editPriority, setEditPriority] = useState<TaskPriority>(() =>
    parseTaskPriority(priority),
  );
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(() =>
    parseTaskRecurrence(recurrence),
  );
  const [editCategoryId, setEditCategoryId] = useState<string | null>(categoryId);
  const [editLabelIds, setEditLabelIds] = useState<string[]>(labelIds);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [editCompleted, setEditCompleted] = useState(completed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...extraLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [extraLabels, labels]);

  const attachableLabelIds = useMemo(() => {
    const allowedIds = new Set(availableLabels.map((label) => label.id));
    return editLabelIds.filter((labelId) => allowedIds.has(labelId));
  }, [availableLabels, editLabelIds]);

  function startEditing() {
    setEditTitle(title);
    setEditDescription(description ?? "");
    setEditDueAt(isoToDatetimeLocalValue(dueAt));
    setEditReminder(
      reminderFormFromDb({
        reminderAt,
        reminderMode,
        reminderOffsetMinutes,
      }),
    );
    setEditPriority(parseTaskPriority(priority));
    setEditRecurrence(parseTaskRecurrence(recurrence));
    setEditCategoryId(categoryId);
    setEditLabelIds(labelIds);
    setExtraLabels([]);
    setEditCompleted(completed);
    setError(null);
    setIsEditing(true);
  }

  function handleEditDueChange(nextDue: string) {
    setEditDueAt(nextDue);
    setEditReminder((current) => syncReminderFormWithDueLocal(nextDue, current));
  }

  function cancelEditing() {
    setError(null);
    setIsEditing(false);
  }

  useEffect(() => {
    if (!initialEditing) {
      return;
    }

    itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialEditing]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const newDueAt = datetimeLocalValueToIso(editDueAt);
    const recurrenceError = validateRecurrenceDueAt(editRecurrence, newDueAt);
    if (recurrenceError) {
      setError(recurrenceError);
      setLoading(false);
      return;
    }

    const reminderColumns = toReminderDbColumns(newDueAt, editReminder);
    const dueAtChanged = !dueAtValuesEqual(dueAt, newDueAt);
    const becomingComplete = !completed && editCompleted;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: trimmedTitle,
        description: editDescription.trim() || null,
        due_at: newDueAt,
        ...reminderColumns,
        priority: editPriority,
        recurrence: editRecurrence,
        category_id: editCategoryId,
        // RPC handles completed=true + spawn; never flip completed true here.
        ...(becomingComplete ? {} : { completed: editCompleted }),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const labelsError = await syncTaskLabels(
      supabase,
      id,
      attachableLabelIds,
    );

    if (labelsError) {
      setError(labelsError.message);
      setLoading(false);
      return;
    }

    if (becomingComplete) {
      const { data: completeData, error: completeError } =
        await completeTaskWithRecurrence(supabase, id);
      if (completeError) {
        setError(completeError);
        setLoading(false);
        return;
      }
      if (completeData?.next_task_id) {
        console.info("[TaskListItem] next occurrence created", {
          id,
          next_task_id: completeData.next_task_id,
          next_due_at: completeData.next_due_at ?? null,
        });
      }
    }

    if (dueAtChanged) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to save due date history.");
        setLoading(false);
        return;
      }

      const { error: historyError } = await supabase
        .from("task_due_date_changes")
        .insert({
          task_id: id,
          user_id: user.id,
          previous_due_at: dueAt,
          new_due_at: newDueAt,
          change_direction: getChangeDirection(dueAt, newDueAt),
        });

      if (historyError) {
        setError(historyError.message);
        setLoading(false);
        return;
      }
    }

    setIsEditing(false);
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  const wrapperClassName = embedded
    ? ""
    : isEditing
      ? "rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-stone-900"
      : `${cardClassName} p-5`;

  if (isEditing) {
    const editContent = (
      <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label
              htmlFor={`edit-title-${id}`}
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Title
            </label>
            <input
              id={`edit-title-${id}`}
              type="text"
              required
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className={fieldClassName}
            />
          </div>

          <div>
            <label
              htmlFor={`edit-description-${id}`}
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Description{" "}
              <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <textarea
              id={`edit-description-${id}`}
              rows={2}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              className={`${fieldClassName} resize-none`}
            />
          </div>

          <DueDatetimeFields
            id={`edit-due-at-${id}`}
            value={editDueAt}
            onChange={handleEditDueChange}
            labelClassName="mb-1.5 block text-sm font-medium text-stone-700"
          />

          <ReminderFields
            id={`edit-reminder-${id}`}
            dueLocal={editDueAt}
            value={editReminder}
            onChange={setEditReminder}
            labelClassName="mb-1.5 block text-sm font-medium text-stone-700"
          />

          <PrioritySelect
            id={`edit-priority-${id}`}
            value={editPriority}
            onChange={setEditPriority}
            labelClassName="mb-1.5 block text-sm font-medium text-stone-700"
          />

          <RecurrenceSelect
            id={`edit-recurrence-${id}`}
            value={editRecurrence}
            onChange={setEditRecurrence}
            dueLocal={editDueAt}
            labelClassName="mb-1.5 block text-sm font-medium text-stone-700"
          />

          <CategorySelect
            id={`edit-category-${id}`}
            categories={categories}
            value={editCategoryId}
            onChange={setEditCategoryId}
            className={fieldClassName}
          />

          <LabelSelect
            id={`edit-labels-${id}`}
            labels={availableLabels}
            categories={categories}
            categoryId={editCategoryId}
            categoryIdsByLabelId={categoryIdsByLabelId}
            value={editLabelIds}
            onChange={setEditLabelIds}
            onLabelCreated={(label) =>
              setExtraLabels((current) => [...current, label])
            }
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={editCompleted}
              onChange={(event) => setEditCompleted(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20"
            />
            Mark as completed
          </label>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={loading}
              className="cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
    );

    if (embedded) {
      return (
        <div id={`task-${id}`} className={wrapperClassName}>
          {editContent}
        </div>
      );
    }

    return (
      <li ref={itemRef} id={`task-${id}`} className={wrapperClassName}>
        {editContent}
      </li>
    );
  }

  const historyLines = getDueDateHistoryLines(dueDateHistory);
  const showMovedLaterNudge = dueDateHistory.movedLaterCount >= 3;
  const subtaskProgress = getSubtaskProgress(subtasks);
  const reminderLabel = getReminderCardLabel(reminderAt, completed, {
    reminderMode,
    reminderOffsetMinutes,
  });
  const taskPriority = parseTaskPriority(priority);
  const taskRecurrence = parseTaskRecurrence(recurrence);
  const recurrenceBadgeText = getRecurrenceBadgeText(taskRecurrence);

  const readContent = (
    <>
      <div className="flex items-start gap-3">
        <TaskCompleteToggle
          id={id}
          completed={completed}
          title={title}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2
              className={`min-w-0 text-base font-semibold leading-snug text-stone-900 dark:text-stone-100 ${
                  completed ? "line-through text-stone-400 dark:text-stone-500" : ""
                }`}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{description}</p>
            ) : null}
            {(category || categoryUnavailable) ? (
              <div className="mt-2">
                <CategoryBadge
                  category={category}
                  unavailable={categoryUnavailable}
                />
              </div>
            ) : null}
            {taskLabels.labels.length > 0 || taskLabels.unavailableCount > 0 ? (
              <div className="mt-2">
                <LabelBadges
                  labels={taskLabels.labels}
                  unavailableCount={taskLabels.unavailableCount}
                />
              </div>
            ) : null}
            {historyLines.length > 0 || showMovedLaterNudge ? (
              <div className="mt-2 space-y-1 text-xs text-stone-500">
                {historyLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {showMovedLaterNudge ? <p>{MOVED_LATER_NUDGE}</p> : null}
              </div>
            ) : null}
            {subtaskProgress ? (
              <TaskSubtaskProgress progress={subtaskProgress} compact />
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                completed
                  ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              {completed ? "Completed" : "Open"}
            </span>
            <PriorityBadge priority={taskPriority} />
            {recurrenceBadgeText ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                {recurrenceBadgeText}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {taskRecurrence !== DEFAULT_TASK_RECURRENCE && !completed ? (
        <p className="mt-2 pl-8 text-xs text-stone-500 dark:text-stone-400">
          {RECURRENCE_NEXT_OCCURRENCE_HINT}
        </p>
      ) : null}
      <TaskSubtaskList taskId={id} subtasks={subtasks} />
      <div className="mt-4 flex items-center justify-between gap-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
          <div>
            <dt className="sr-only">Due</dt>
            <dd>Due: {dueAt ? formatDateTime(dueAt) : "No due date"}</dd>
          </div>
          {reminderLabel ? (
            <div>
              <dt className="sr-only">Reminder</dt>
              <dd
                className={
                  reminderLabel.overdue
                    ? "font-medium text-rose-700 dark:text-rose-300"
                    : undefined
                }
              >
                {reminderLabel.text}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Created</dt>
            <dd>Created: {formatDate(createdAt)}</dd>
          </div>
        </dl>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit "${title}"`}
            className="shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:bg-stone-50 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100"
          >
            <PencilIcon />
          </button>
          <TaskDeleteButton id={id} title={title} onDeleted={onDeleted} />
        </div>
      </div>
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
