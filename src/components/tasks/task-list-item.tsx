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
import {
  TaskFormMoreDetails,
  TaskFormNotesToggle,
} from "@/components/tasks/task-form-shared";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NULL_CATEGORY_DISPLAY } from "@/lib/categories/display";
import type { CategoryDisplay } from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import type { TaskLabelDisplay } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import {
  completeTaskWithRecurrence,
} from "@/lib/tasks/complete-with-recurrence";
import type { TaskCreatorProfile } from "@/lib/tasks/creators";
import {
  datetimeLocalValueToIso,
  isoHasExplicitTime,
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
  validateRecurrenceDueAt,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import {
  emptyReminderFormState,
  getReminderCardLabel,
  reminderFormFromDb,
  syncReminderFormWithDueLocal,
  toReminderDbColumns,
  type ReminderFormState,
} from "@/lib/tasks/reminder";
import { isFocusDueOverdue } from "@/lib/tasks/focus";
import {
  compactFieldClassName,
  formErrorClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
  taskActionButtonClassName,
  taskRowClassName,
  titleFieldClassName,
} from "@/lib/ui/field-classes";
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
import { Bell, ListTodo, Repeat } from "lucide-react";
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
  /** Task creator (tasks.user_id). */
  taskUserId: string;
  currentUserId: string;
  creator?: TaskCreatorProfile | null;
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
  canDelete = true,
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
  const [notesOpen, setNotesOpen] = useState(Boolean(description?.trim()));
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(categoryId) || labelIds.length > 0,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const isOwnTask = taskUserId === currentUserId;
  const showCreator = !isOwnTask;
  const editableCategories = useMemo(() => {
    if (isOwnTask) {
      return categories;
    }
    // Members cannot move someone else's shared task into Personal
    return categories.filter((entry) => entry.scope !== "personal");
  }, [categories, isOwnTask]);

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

  const editDetailsSummary = useMemo(() => {
    const parts: string[] = [];
    if (editCategoryId) {
      parts.push("category");
    }
    if (editLabelIds.length > 0) {
      parts.push(
        editLabelIds.length === 1
          ? "1 label"
          : `${editLabelIds.length} labels`,
      );
    }
    return parts.join(", ");
  }, [editCategoryId, editLabelIds.length]);

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
    setNotesOpen(Boolean(description?.trim()));
    setDetailsOpen(Boolean(categoryId) || labelIds.length > 0);
    setError(null);
    setIsEditing(true);
  }

  function handleEditDueChange(nextDue: string) {
    setEditDueAt(nextDue);
    if (!nextDue) {
      setEditReminder(emptyReminderFormState());
      setEditRecurrence(DEFAULT_TASK_RECURRENCE);
      return;
    }
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
      ? "rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900/50 dark:bg-stone-900"
      : taskRowClassName;

  if (isEditing) {
    const editContent = (
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label htmlFor={`edit-title-${id}`} className="sr-only">
            Title
          </label>
          <input
            id={`edit-title-${id}`}
            type="text"
            required
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            className={titleFieldClassName}
            placeholder="Task title"
          />
        </div>

        <TaskFormNotesToggle
          open={notesOpen || Boolean(editDescription.trim())}
          onOpen={() => setNotesOpen(true)}
        >
          <div>
            <label
              htmlFor={`edit-description-${id}`}
              className={formLabelClassName}
            >
              Notes
              <span className="font-normal text-stone-400 dark:text-stone-500">
                {" "}
                · optional
              </span>
            </label>
            <textarea
              id={`edit-description-${id}`}
              rows={2}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              className={`${compactFieldClassName} resize-none`}
              placeholder="Extra details"
            />
          </div>
        </TaskFormNotesToggle>

        <div className="grid gap-3 sm:grid-cols-2">
          <DueDatetimeFields
            id={`edit-due-at-${id}`}
            value={editDueAt}
            onChange={handleEditDueChange}
          />
          <PrioritySelect
            id={`edit-priority-${id}`}
            value={editPriority}
            onChange={setEditPriority}
          />
          <RecurrenceSelect
            id={`edit-recurrence-${id}`}
            value={editRecurrence}
            onChange={setEditRecurrence}
            dueLocal={editDueAt}
          />
          <ReminderFields
            id={`edit-reminder-${id}`}
            dueLocal={editDueAt}
            value={editReminder}
            onChange={setEditReminder}
          />
        </div>

        <TaskFormMoreDetails
          open={detailsOpen}
          onToggle={() => setDetailsOpen((open) => !open)}
          summary={editDetailsSummary}
        >
          <CategorySelect
            id={`edit-category-${id}`}
            categories={editableCategories}
            value={editCategoryId}
            onChange={(next) => {
              setEditCategoryId(next);
              if (next) {
                setDetailsOpen(true);
              }
            }}
            className={compactFieldClassName}
            compact
          />
          <LabelSelect
            id={`edit-labels-${id}`}
            labels={availableLabels}
            categories={editableCategories}
            categoryId={editCategoryId}
            categoryIdsByLabelId={categoryIdsByLabelId}
            value={editLabelIds}
            onChange={(next) => {
              setEditLabelIds(next);
              if (next.length > 0) {
                setDetailsOpen(true);
              }
            }}
            onLabelCreated={(label) =>
              setExtraLabels((current) => [...current, label])
            }
          />
        </TaskFormMoreDetails>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={editCompleted}
            onChange={(event) => setEditCompleted(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20"
          />
          Mark as completed
        </label>

        {error ? <p className={formErrorClassName}>{error}</p> : null}

        <div className="flex flex-wrap gap-2 pt-0.5">
          <button
            type="submit"
            disabled={loading}
            className={formPrimaryButtonClassName}
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={loading}
            className={formSecondaryButtonClassName}
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
  const dueIsOverdue =
    Boolean(dueAt) && !completed && isFocusDueOverdue(dueAt!);
  const hasChecklist = subtasks.length > 0;
  const dueHasTime = isoHasExplicitTime(dueAt);
  const workspaceDisplay =
    category ??
    (categoryUnavailable ? null : NULL_CATEGORY_DISPLAY);

  const readContent = (
    <>
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          <TaskCompleteToggle id={id} completed={completed} title={title} />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
            <CategoryBadge
              category={workspaceDisplay}
              unavailable={categoryUnavailable}
              compact
            />
            <h2
              className={`min-w-0 flex-1 basis-[12rem] text-base font-medium leading-snug break-words text-stone-900 dark:text-stone-100 ${
                completed
                  ? "text-stone-400 line-through dark:text-stone-500"
                  : ""
              }`}
            >
              {title}
            </h2>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {dueAt ? (
              <span
                className={`inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
                  dueIsOverdue
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                }`}
              >
                {dueIsOverdue ? "Overdue · " : ""}
                {formatDueMeta(dueAt)}
                {dueHasTime ? (
                  <span className="sr-only"> (includes time)</span>
                ) : null}
              </span>
            ) : null}
            <PriorityBadge
              priority={taskPriority}
              hideDefault
              className="!px-2 !py-1 !text-xs"
            />
            {reminderLabel ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                  reminderLabel.overdue
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                }`}
                title={reminderLabel.text}
              >
                <Bell className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{reminderLabel.text}</span>
              </span>
            ) : null}
            {recurrenceBadgeText ? (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
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

          {description ? (
            <p className="line-clamp-1 break-words text-sm text-stone-500 dark:text-stone-400">
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
            <TaskSubtaskProgress
              progress={subtaskProgress}
              compact
              expanded={checklistOpen}
              onToggle={() => setChecklistOpen((open) => !open)}
            />
          ) : null}

          {checklistOpen ? (
            <TaskSubtaskList
              taskId={id}
              subtasks={subtasks}
              hideHeading={hasChecklist}
            />
          ) : null}

          <p className="sr-only">
            Created {formatDate(createdAt)}
            {dueAt ? `. Due ${formatDateTime(dueAt)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5 sm:flex-row sm:items-start">
          {showCreator ? (
            <span
              className="flex h-10 w-10 items-center justify-center"
              title={`Created by ${creator?.displayName ?? "workspace member"}`}
            >
              <UserAvatar
                name={creator?.displayName ?? "Member"}
                avatarUrl={creator?.avatarUrl}
                size="sm"
              />
            </span>
          ) : null}
          {!hasChecklist ? (
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              aria-label={`Add checklist to "${title}"`}
              title="Checklist"
              className={taskActionButtonClassName}
            >
              <ListTodo className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit "${title}"`}
            className={taskActionButtonClassName}
          >
            <PencilIcon />
          </button>
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
