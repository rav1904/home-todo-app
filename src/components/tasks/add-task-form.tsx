"use client";

import { CategorySelect } from "@/components/tasks/category-select";
import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import { LabelSelect } from "@/components/tasks/label-select";
import { ReminderFields } from "@/components/tasks/reminder-fields";
import { RecurrenceSelect } from "@/components/tasks/recurrence-select";
import {
  DEFAULT_TASK_PRIORITY,
  PrioritySelect,
} from "@/components/tasks/priority-select";
import { getPersonalCategoryId } from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import { datetimeLocalValueToIso } from "@/lib/tasks/due-datetime";
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
import {
  compactFieldClassName,
  densePanelClassName,
  formErrorClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
  titleFieldClassName,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import {
  AlignLeft,
  Bell,
  Calendar,
  Flag,
  Folder,
  Repeat,
  Tags,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

type AddTaskFormProps = {
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  defaultCategoryId?: string | null;
  showHeading?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
};

type PanelKey =
  | "category"
  | "due"
  | "priority"
  | "reminder"
  | "repeat"
  | "labels"
  | "notes";

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
    <div className="rounded-lg border border-stone-200/80 p-2.5 dark:border-stone-700/80">
      {children}
    </div>
  );
}

export function AddTaskForm({
  categories,
  labels,
  categoryIdsByLabelId = {},
  defaultCategoryId = null,
  showHeading = true,
  embedded = false,
  onSuccess,
}: AddTaskFormProps) {
  const router = useRouter();
  const personalDefault =
    defaultCategoryId ?? getPersonalCategoryId(categories);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
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
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...extraLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [extraLabels, labels]);

  const hasDue = Boolean(dueAt);
  const hasReminder = Boolean(reminder.mode);
  const hasPriority = priority !== DEFAULT_TASK_PRIORITY;
  const hasRepeat = recurrence !== DEFAULT_TASK_RECURRENCE;
  const hasLabels = labelIds.length > 0;
  const hasNotes = Boolean(description.trim());
  const hasCategory = Boolean(categoryId);

  function togglePanel(panel: PanelKey) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function handleDueChange(nextDue: string) {
    setDueAt(nextDue);
    setReminder((current) => syncReminderFormWithDueLocal(nextDue, current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to add a task.");
      setLoading(false);
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      setLoading(false);
      return;
    }

    const dueAtIso = datetimeLocalValueToIso(dueAt);
    const recurrenceError = validateRecurrenceDueAt(recurrence, dueAtIso);
    if (recurrenceError) {
      setError(recurrenceError);
      setLoading(false);
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
      })
      .select("id")
      .single();

    if (insertError || !createdTask) {
      setError(insertError?.message ?? "Could not create task.");
      setLoading(false);
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
        return;
      }
    }

    setTitle("");
    setDescription("");
    setDueAt("");
    setReminder(emptyReminderFormState());
    setPriority(DEFAULT_TASK_PRIORITY);
    setRecurrence(DEFAULT_TASK_RECURRENCE);
    setCategoryId(personalDefault);
    setLabelIds([]);
    setExtraLabels([]);
    setOpenPanel(null);
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        embedded ? "space-y-2" : `${densePanelClassName} space-y-2 p-3`
      }
    >
      {showHeading ? (
        <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
          Quick add
        </h2>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="task-title" className="sr-only">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            required
            autoFocus={embedded}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={titleFieldClassName}
            placeholder="What needs doing?"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`${formPrimaryButtonClassName} shrink-0`}
        >
          {loading ? "…" : "Add"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-0.5">
        <ToolbarButton
          label="Workspace / category"
          active={openPanel === "category"}
          populated={hasCategory}
          onClick={() => togglePanel("category")}
        >
          <Folder className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Due date"
          active={openPanel === "due"}
          populated={hasDue}
          onClick={() => togglePanel("due")}
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </ToolbarButton>
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
        <ToolbarButton
          label="Notes"
          active={openPanel === "notes"}
          populated={hasNotes}
          onClick={() => togglePanel("notes")}
        >
          <AlignLeft className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </div>

      {openPanel === "category" ? (
        <PanelShell>
          <CategorySelect
            id="task-category"
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            className={compactFieldClassName}
            compact
          />
        </PanelShell>
      ) : null}

      {openPanel === "due" || hasDue ? (
        <PanelShell>
          <DueDatetimeFields
            id="task-due-at"
            value={dueAt}
            onChange={handleDueChange}
          />
        </PanelShell>
      ) : null}

      {openPanel === "priority" || hasPriority ? (
        <PanelShell>
          <PrioritySelect
            id="task-priority"
            value={priority}
            onChange={setPriority}
          />
        </PanelShell>
      ) : null}

      {openPanel === "reminder" || hasReminder ? (
        <PanelShell>
          <ReminderFields
            id="task-reminder"
            dueLocal={dueAt}
            value={reminder}
            onChange={setReminder}
          />
        </PanelShell>
      ) : null}

      {openPanel === "repeat" || hasRepeat ? (
        <PanelShell>
          <RecurrenceSelect
            id="task-recurrence"
            value={recurrence}
            onChange={setRecurrence}
            dueLocal={dueAt}
          />
        </PanelShell>
      ) : null}

      {openPanel === "labels" || hasLabels ? (
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

      {openPanel === "notes" || hasNotes ? (
        <PanelShell>
          <label htmlFor="task-description" className={formLabelClassName}>
            Notes
            <span className="font-normal text-stone-400 dark:text-stone-500">
              {" "}
              · optional
            </span>
          </label>
          <textarea
            id="task-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${compactFieldClassName} resize-none`}
            placeholder="Extra details"
          />
        </PanelShell>
      ) : null}

      {error ? <p className={formErrorClassName}>{error}</p> : null}
    </form>
  );
}
