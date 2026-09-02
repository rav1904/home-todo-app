"use client";

import { CategorySelect } from "@/components/tasks/category-select";
import { AssigneeSelect } from "@/components/tasks/assignee-select";
import { ChecklistDraftPanel } from "@/components/tasks/checklist-draft-field";
import {
  ChecklistPanel,
  ChecklistToolbarButton,
} from "@/components/tasks/checklist-toggle";
import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import { LabelSelect } from "@/components/tasks/label-select";
import { ReminderFields } from "@/components/tasks/reminder-fields";
import { RecurrenceSelect } from "@/components/tasks/recurrence-select";
import {
  DEFAULT_TASK_PRIORITY,
  PrioritySelect,
} from "@/components/tasks/priority-select";
import {
  TaskNotesField,
  TaskTitleField,
} from "@/components/tasks/task-form-shared";
import { getPersonalCategoryId } from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import { datetimeLocalValueToIso, joinDatetimeLocalValue } from "@/lib/tasks/due-datetime";
import type { TaskPriority } from "@/lib/tasks/priority";
import {
  DEFAULT_TASK_RECURRENCE,
  validateRecurrenceDueAt,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import {
  emptyReminderFormState,
  syncReminderFormWithDueLocal,
  toReminderDbColumns,
  type ReminderFormState,
} from "@/lib/tasks/reminder";
import { validateTaskTitle } from "@/lib/tasks/title";
import {
  compactFieldClassName,
  densePanelClassName,
  formErrorClassName,
  formPrimaryButtonClassName,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { LoadingButton } from "@/components/ui/loading-button";
import { createClient } from "@/lib/supabase/client";
import { Bell, Flag, Repeat, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type AddTaskFormProps = {
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  defaultCategoryId?: string | null;
  /** YYYY-MM-DD or datetime-local value; time stays optional unless included. */
  defaultDueAt?: string | null;
  showHeading?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
};

type PanelKey = "priority" | "reminder" | "repeat" | "labels" | "checklist";

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
    <div className="min-w-0 rounded-lg border border-stone-200/80 p-2.5 dark:border-stone-700/80">
      {children}
    </div>
  );
}

export function AddTaskForm({
  categories,
  labels,
  categoryIdsByLabelId = {},
  defaultCategoryId = null,
  defaultDueAt = null,
  showHeading = true,
  embedded = false,
  onSuccess,
}: AddTaskFormProps) {
  const router = useRouter();
  const personalDefault =
    defaultCategoryId ?? getPersonalCategoryId(categories);
  const initialDueAt = useMemo(() => {
    if (!defaultDueAt) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(defaultDueAt)) {
      return joinDatetimeLocalValue(defaultDueAt, "00:00");
    }
    return defaultDueAt;
  }, [defaultDueAt]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [reminder, setReminder] = useState<ReminderFormState>(
    emptyReminderFormState,
  );
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    DEFAULT_TASK_RECURRENCE,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    () => personalDefault,
  );
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assigneeResetHint, setAssigneeResetHint] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setCurrentUserId(user?.id ?? null);
      }
    }
    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...extraLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [extraLabels, labels]);

  const hasReminder = Boolean(reminder.mode);
  const hasPriority = priority !== DEFAULT_TASK_PRIORITY;
  const hasRepeat = recurrence !== DEFAULT_TASK_RECURRENCE;
  const hasLabels = labelIds.length > 0;
  const hasChecklist = draftSubtasks.length > 0;

  function togglePanel(panel: PanelKey) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function handleDraftSubtasksChange(items: string[]) {
    setDraftSubtasks(items);
    if (items.length > 0) {
      setOpenPanel("checklist");
    }
  }

  function handleDueChange(nextDue: string) {
    setDueAt(nextDue);
    if (!nextDue) {
      setReminder(emptyReminderFormState());
      setRecurrence(DEFAULT_TASK_RECURRENCE);
      return;
    }
    setReminder((current) => syncReminderFormWithDueLocal(nextDue, current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || loading) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to add a task.");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const trimmedTitle = title.trim();

    const dueAtIso = datetimeLocalValueToIso(dueAt);
    const recurrenceError = validateRecurrenceDueAt(recurrence, dueAtIso);
    if (recurrenceError) {
      setError(recurrenceError);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const reminderColumns = toReminderDbColumns(dueAtIso, reminder);

    const { data: createdTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        description: description.trim() || null,
        due_at: dueAtIso,
        ...reminderColumns,
        priority,
        recurrence,
        category_id: categoryId,
        assigned_to: assignedTo,
      })
      .select("id")
      .single();

    if (insertError || !createdTask) {
      setError(insertError?.message ?? "Could not create task.");
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    if (labelIds.length > 0) {
      const allowedIds = new Set(availableLabels.map((label) => label.id));
      const attachableLabelIds = labelIds.filter((labelId) =>
        allowedIds.has(labelId),
      );

      const labelsError = await syncTaskLabels(
        supabase,
        createdTask.id,
        attachableLabelIds,
      );

      if (labelsError) {
        setError(labelsError.message);
        setLoading(false);
        submittingRef.current = false;
        return;
      }
    }

    if (draftSubtasks.length > 0) {
      const timestamp = new Date().toISOString();
      const { error: subtasksError } = await supabase
        .from("task_subtasks")
        .insert(
          draftSubtasks.map((subtaskTitle, index) => ({
            task_id: createdTask.id,
            user_id: user.id,
            title: subtaskTitle,
            sort_order: index,
            completed: false,
            updated_at: timestamp,
          })),
        );

      if (subtasksError) {
        setError(subtasksError.message);
        setLoading(false);
        submittingRef.current = false;
        return;
      }
    }

    setTitle("");
    setDescription("");
    setDueAt(initialDueAt);
    setReminder(emptyReminderFormState());
    setPriority(DEFAULT_TASK_PRIORITY);
    setRecurrence(DEFAULT_TASK_RECURRENCE);
    setCategoryId(personalDefault);
    setAssignedTo(null);
    setAssigneeResetHint(false);
    setLabelIds([]);
    setExtraLabels([]);
    setDraftSubtasks([]);
    setOpenPanel(null);
    setLoading(false);
    submittingRef.current = false;
    router.refresh();
    onSuccess?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        embedded
          ? "min-w-0 space-y-2.5"
          : `${densePanelClassName} min-w-0 space-y-2.5 p-3`
      }
    >
      {showHeading ? (
        <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
          Quick add
        </h2>
      ) : null}

      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <TaskTitleField
            id="task-title"
            value={title}
            onChange={setTitle}
            autoFocus={embedded}
          />
        </div>
        <LoadingButton
          type="submit"
          loading={loading}
          idleLabel="Add"
          loadingLabel="Adding…"
          minLabelWidthClassName="min-w-[4.75rem]"
          className={`${formPrimaryButtonClassName} min-h-11 shrink-0 self-start`}
        />
      </div>

      <TaskNotesField
        id="task-description"
        value={description}
        onChange={setDescription}
        rows={2}
      />

      <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
        <CategorySelect
          id="task-category"
          categories={categories}
          value={categoryId}
          onChange={(next) => {
            setCategoryId(next);
            setAssigneeResetHint(false);
          }}
          className={`${compactFieldClassName} min-h-11`}
          compact
        />
        <DueDatetimeFields
          id="task-due-at"
          value={dueAt}
          onChange={handleDueChange}
        />
      </div>

      <AssigneeSelect
        id="task-assignee"
        categoryId={categoryId}
        value={assignedTo}
        currentUserId={currentUserId}
        onChange={(next) => {
          setAssignedTo(next);
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
          active={openPanel === "priority"}
          populated={hasPriority}
          onClick={() => togglePanel("priority")}
        >
          <Flag className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Reminder"
          active={openPanel === "reminder"}
          populated={hasReminder}
          onClick={() => togglePanel("reminder")}
        >
          <Bell className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Repeat"
          active={openPanel === "repeat"}
          populated={hasRepeat}
          onClick={() => togglePanel("repeat")}
        >
          <Repeat className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Labels"
          active={openPanel === "labels"}
          populated={hasLabels}
          onClick={() => togglePanel("labels")}
        >
          <Tags className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ChecklistToolbarButton
          open={openPanel === "checklist"}
          populated={hasChecklist}
          countLabel={
            hasChecklist ? `0/${draftSubtasks.length}` : null
          }
          onClick={() => togglePanel("checklist")}
        />
      </div>

      {openPanel === "priority" ? (
        <PanelShell>
          <PrioritySelect
            id="task-priority"
            value={priority}
            onChange={setPriority}
          />
        </PanelShell>
      ) : null}

      {openPanel === "reminder" ? (
        <PanelShell>
          <ReminderFields
            id="task-reminder"
            dueLocal={dueAt}
            value={reminder}
            onChange={setReminder}
          />
        </PanelShell>
      ) : null}

      {openPanel === "repeat" ? (
        <PanelShell>
          <RecurrenceSelect
            id="task-recurrence"
            value={recurrence}
            onChange={setRecurrence}
            dueLocal={dueAt}
          />
        </PanelShell>
      ) : null}

      {openPanel === "labels" ? (
        <PanelShell>
          <LabelSelect
            id="task-labels"
            labels={availableLabels}
            categories={categories}
            categoryId={categoryId}
            categoryIdsByLabelId={categoryIdsByLabelId}
            value={labelIds}
            onChange={setLabelIds}
            onLabelCreated={(label) =>
              setExtraLabels((current) => [...current, label])
            }
          />
        </PanelShell>
      ) : null}

      <ChecklistPanel open={openPanel === "checklist"}>
        <ChecklistDraftPanel
          items={draftSubtasks}
          onChange={handleDraftSubtasksChange}
        />
      </ChecklistPanel>

      {error ? <p className={formErrorClassName}>{error}</p> : null}
    </form>
  );
}
