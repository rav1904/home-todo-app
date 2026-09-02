"use client";

import { TaskCancelRestoreButton } from "@/components/tasks/task-cancel-restore-button";
import { TaskSubtaskList } from "@/components/tasks/task-subtask-list";
import {
  ChecklistPanel,
  ChecklistToolbarButton,
} from "@/components/tasks/checklist-toggle";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import { CategorySelect } from "@/components/tasks/category-select";
import { AssigneeSelect } from "@/components/tasks/assignee-select";
import { LabelSelect } from "@/components/tasks/label-select";
import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import { ReminderFields } from "@/components/tasks/reminder-fields";
import { PrioritySelect } from "@/components/tasks/priority-select";
import { RecurrenceSelect } from "@/components/tasks/recurrence-select";
import {
  TaskNotesField,
  TaskTitleField,
} from "@/components/tasks/task-form-shared";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import { completeTaskWithRecurrence } from "@/lib/tasks/complete-with-recurrence";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from "@/lib/tasks/due-datetime";
import {
  dueAtValuesEqual,
  getChangeDirection,
} from "@/lib/tasks/due-date-change";
import {
  DEFAULT_TASK_PRIORITY,
  parseTaskPriority,
  type TaskPriority,
} from "@/lib/tasks/priority";
import {
  DEFAULT_TASK_RECURRENCE,
  parseTaskRecurrence,
  validateRecurrenceDueAt,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import {
  emptyReminderFormState,
  reminderFormFromDb,
  syncReminderFormWithDueLocal,
  toReminderDbColumns,
  type ReminderFormState,
} from "@/lib/tasks/reminder";
import { validateTaskTitle } from "@/lib/tasks/title";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import {
  compactFieldClassName,
  formErrorClassName,
  formPrimaryButtonClassName,
  formSecondaryButtonClassName,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import { Bell, Flag, Repeat, Tags, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type EditPanelKey = "priority" | "reminder" | "repeat" | "labels" | "checklist";

type EditTaskModalProps = {
  open: boolean;
  onClose: () => void;
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
  categoryId: string | null;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  labelIds: string[];
  subtasks?: TaskSubtask[];
  taskUserId: string;
  currentUserId: string;
  assignedTo?: string | null;
  canDelete?: boolean;
  onSuccess?: () => void;
  onDeleted?: () => void;
};

function ToolbarButton({
  label,
  active,
  populated,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  populated: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`${toolbarIconButtonClassName} ${
        active || populated ? toolbarIconButtonActiveClassName : ""
      }`}
    >
      {children}
    </button>
  );
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-stone-50/80 p-2.5 dark:bg-stone-800/40">
      {children}
    </div>
  );
}

export function EditTaskModal({
  open,
  onClose,
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
  categoryId,
  categories,
  labels,
  categoryIdsByLabelId = {},
  labelIds,
  subtasks = [],
  taskUserId,
  currentUserId,
  assignedTo = null,
  canDelete = true,
  onSuccess,
  onDeleted,
}: EditTaskModalProps) {
  const router = useRouter();
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
  const [editAssignedTo, setEditAssignedTo] = useState<string | null>(assignedTo);
  const [assigneeResetHint, setAssigneeResetHint] = useState(false);
  const [editLabelIds, setEditLabelIds] = useState<string[]>(labelIds);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [editCompleted, setEditCompleted] = useState(completed);
  const [editPanel, setEditPanel] = useState<EditPanelKey | null>(
    subtasks.length > 0 ? "checklist" : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const isOwnTask = taskUserId === currentUserId;
  const isCancelled = Boolean(cancelledAt);

  const editableCategories = useMemo(() => {
    if (isOwnTask) {
      return categories;
    }
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

  const checklistCountLabel =
    subtasks.length > 0
      ? `${subtasks.filter((item) => item.completed).length}/${subtasks.length}`
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }

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
    setEditAssignedTo(assignedTo);
    setAssigneeResetHint(false);
    setEditLabelIds(labelIds);
    setExtraLabels([]);
    setEditCompleted(completed);
    setEditPanel(subtasks.length > 0 ? "checklist" : null);
    setError(null);
    setLoading(false);
    savingRef.current = false;
  }, [
    open,
    title,
    description,
    dueAt,
    reminderAt,
    reminderMode,
    reminderOffsetMinutes,
    priority,
    recurrence,
    categoryId,
    assignedTo,
    labelIds,
    completed,
    subtasks.length,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  function toggleEditPanel(panel: EditPanelKey) {
    setEditPanel((current) => (current === panel ? null : panel));
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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || loading) {
      return;
    }

    savingRef.current = true;
    setLoading(true);
    setError(null);

    const titleError = validateTaskTitle(editTitle);
    if (titleError) {
      setError(titleError);
      setLoading(false);
      savingRef.current = false;
      return;
    }

    const trimmedTitle = editTitle.trim();
    const supabase = createClient();
    const newDueAt = datetimeLocalValueToIso(editDueAt);
    const recurrenceError = validateRecurrenceDueAt(editRecurrence, newDueAt);
    if (recurrenceError) {
      setError(recurrenceError);
      setLoading(false);
      savingRef.current = false;
      return;
    }

    const reminderColumns = toReminderDbColumns(newDueAt, editReminder);
    const dueAtChanged = !dueAtValuesEqual(dueAt, newDueAt);
    const becomingComplete = !completed && !cancelledAt && editCompleted;

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
        assigned_to: editAssignedTo,
        ...(becomingComplete ? {} : { completed: editCompleted }),
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      savingRef.current = false;
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
      savingRef.current = false;
      return;
    }

    if (becomingComplete) {
      const { error: completeError } = await completeTaskWithRecurrence(
        supabase,
        id,
      );
      if (completeError) {
        setError(completeError);
        setLoading(false);
        savingRef.current = false;
        return;
      }
    }

    if (dueAtChanged) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be signed in to save due date history.");
        setLoading(false);
        savingRef.current = false;
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
        savingRef.current = false;
        return;
      }
    }

    setLoading(false);
    savingRef.current = false;
    router.refresh();
    onClose();
    onSuccess?.();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0"
      role="presentation"
      onClick={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`edit-task-title-${id}`}
        className="flex max-h-[min(94vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-xl sm:mb-4 sm:max-h-[min(90vh,820px)] sm:rounded-2xl dark:border-stone-700 dark:bg-stone-900"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
          <h2
            id={`edit-task-title-${id}`}
            className="text-base font-semibold text-stone-900 dark:text-stone-100"
          >
            Edit task
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-3">
            <TaskTitleField
              id={`edit-title-${id}`}
              value={editTitle}
              onChange={setEditTitle}
              placeholder="Task title"
              autoFocus
            />

            <TaskNotesField
              id={`edit-description-${id}`}
              value={editDescription}
              onChange={setEditDescription}
              rows={2}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <CategorySelect
                id={`edit-category-${id}`}
                categories={editableCategories}
                value={editCategoryId}
                onChange={(next) => {
                  setEditCategoryId(next);
                  setAssigneeResetHint(false);
                }}
                className={compactFieldClassName}
                compact
              />
              <DueDatetimeFields
                id={`edit-due-at-${id}`}
                value={editDueAt}
                onChange={handleEditDueChange}
              />
            </div>

            <AssigneeSelect
              id={`edit-assignee-${id}`}
              categoryId={editCategoryId}
              value={editAssignedTo}
              currentUserId={currentUserId}
              onChange={(next) => {
                setEditAssignedTo(next);
                setAssigneeResetHint(false);
              }}
              onInvalidated={() => setAssigneeResetHint(true)}
            />
            {assigneeResetHint ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Assignee was cleared because they are not in this workspace.
              </p>
            ) : null}

            <div className="flex max-w-full flex-wrap items-center gap-1">
              <ToolbarButton
                label="Priority"
                active={editPanel === "priority"}
                populated={editPriority !== DEFAULT_TASK_PRIORITY}
                onClick={() => toggleEditPanel("priority")}
              >
                <Flag className="h-4 w-4" aria-hidden />
              </ToolbarButton>
              <ToolbarButton
                label="Reminder"
                active={editPanel === "reminder"}
                populated={Boolean(editReminder.mode)}
                onClick={() => toggleEditPanel("reminder")}
              >
                <Bell className="h-4 w-4" aria-hidden />
              </ToolbarButton>
              <ToolbarButton
                label="Repeat"
                active={editPanel === "repeat"}
                populated={editRecurrence !== DEFAULT_TASK_RECURRENCE}
                onClick={() => toggleEditPanel("repeat")}
              >
                <Repeat className="h-4 w-4" aria-hidden />
              </ToolbarButton>
              <ToolbarButton
                label="Labels"
                active={editPanel === "labels"}
                populated={editLabelIds.length > 0}
                onClick={() => toggleEditPanel("labels")}
              >
                <Tags className="h-4 w-4" aria-hidden />
              </ToolbarButton>
              <ChecklistToolbarButton
                open={editPanel === "checklist"}
                populated={subtasks.length > 0}
                countLabel={checklistCountLabel}
                onClick={() => toggleEditPanel("checklist")}
              />
            </div>

            {editPanel === "priority" ? (
              <PanelShell>
                <PrioritySelect
                  id={`edit-priority-${id}`}
                  value={editPriority}
                  onChange={setEditPriority}
                />
              </PanelShell>
            ) : null}

            {editPanel === "reminder" ? (
              <PanelShell>
                <ReminderFields
                  id={`edit-reminder-${id}`}
                  dueLocal={editDueAt}
                  value={editReminder}
                  onChange={setEditReminder}
                />
              </PanelShell>
            ) : null}

            {editPanel === "repeat" ? (
              <PanelShell>
                <RecurrenceSelect
                  id={`edit-recurrence-${id}`}
                  value={editRecurrence}
                  onChange={setEditRecurrence}
                  dueLocal={editDueAt}
                />
              </PanelShell>
            ) : null}

            {editPanel === "labels" ? (
              <PanelShell>
                <LabelSelect
                  id={`edit-labels-${id}`}
                  labels={availableLabels}
                  categories={editableCategories}
                  categoryId={editCategoryId}
                  categoryIdsByLabelId={categoryIdsByLabelId}
                  value={editLabelIds}
                  onChange={setEditLabelIds}
                  onLabelCreated={(label) =>
                    setExtraLabels((current) => [...current, label])
                  }
                />
              </PanelShell>
            ) : null}

            <ChecklistPanel open={editPanel === "checklist"}>
              <TaskSubtaskList
                taskId={id}
                subtasks={subtasks}
                hideHeading
                compact
              />
            </ChecklistPanel>

            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              {!isCancelled ? (
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={editCompleted}
                    onChange={(event) => setEditCompleted(event.target.checked)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <span className="min-w-0">Mark as completed</span>
                </label>
              ) : (
                <p className="min-w-0 flex-1 text-sm text-stone-500 dark:text-stone-400">
                  Cancelled
                </p>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                {!completed ? (
                  <TaskCancelRestoreButton
                    id={id}
                    title={title}
                    cancelled={isCancelled}
                    disabled={loading}
                    onDone={() => {
                      onClose();
                      onSuccess?.();
                    }}
                  />
                ) : null}
                {canDelete ? (
                  <TaskDeleteButton
                    id={id}
                    title={title}
                    onDeleted={() => {
                      onClose();
                      onDeleted?.();
                    }}
                    variant="ghost"
                  />
                ) : null}
              </div>
            </div>

            {error ? <p className={formErrorClassName}>{error}</p> : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
            <LoadingButton
              type="submit"
              loading={loading}
              idleLabel="Save"
              loadingLabel="Saving…"
              minLabelWidthClassName="min-w-[5.5rem]"
              className={`${formPrimaryButtonClassName} min-h-11 flex-1 sm:flex-none`}
            />
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`${formSecondaryButtonClassName} min-h-11 flex-1 sm:flex-none`}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
