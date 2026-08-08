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
import {
  TaskFormMoreDetails,
  TaskFormNotesToggle,
} from "@/components/tasks/task-form-shared";
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
  cardClassName,
  compactFieldClassName,
  formErrorClassName,
  formLabelClassName,
  formPrimaryButtonClassName,
  titleFieldClassName,
} from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AddTaskFormProps = {
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  defaultCategoryId?: string | null;
  showHeading?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
};

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [reminder, setReminder] = useState<ReminderFormState>(
    emptyReminderFormState,
  );
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    DEFAULT_TASK_RECURRENCE,
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    () => defaultCategoryId ?? getPersonalCategoryId(categories),
  );
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...extraLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [extraLabels, labels]);

  const detailsSummary = useMemo(() => {
    const parts: string[] = [];
    if (categoryId) {
      parts.push("category");
    }
    if (labelIds.length > 0) {
      parts.push(
        labelIds.length === 1 ? "1 label" : `${labelIds.length} labels`,
      );
    }
    return parts.join(", ");
  }, [categoryId, labelIds.length]);

  function handleDueChange(nextDue: string) {
    setDueAt(nextDue);
    setReminder((current) => syncReminderFormWithDueLocal(nextDue, current));
  }

  function handleCategoryChange(nextCategoryId: string | null) {
    setCategoryId(nextCategoryId);
    if (nextCategoryId) {
      setDetailsOpen(true);
    }
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
    setNotesOpen(false);
    setDueAt("");
    setReminder(emptyReminderFormState());
    setPriority(DEFAULT_TASK_PRIORITY);
    setRecurrence(DEFAULT_TASK_RECURRENCE);
    setCategoryId(defaultCategoryId ?? getPersonalCategoryId(categories));
    setLabelIds([]);
    setExtraLabels([]);
    setDetailsOpen(false);
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={embedded ? "space-y-3" : `${cardClassName} space-y-3 p-4`}
    >
      {showHeading ? (
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Add task
        </h2>
      ) : null}

      <div>
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

      <TaskFormNotesToggle
        open={notesOpen || Boolean(description.trim())}
        onOpen={() => setNotesOpen(true)}
      >
        <div>
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
        </div>
      </TaskFormNotesToggle>

      <div className="grid gap-3 sm:grid-cols-2">
        <DueDatetimeFields
          id="task-due-at"
          value={dueAt}
          onChange={handleDueChange}
        />
        <PrioritySelect
          id="task-priority"
          value={priority}
          onChange={setPriority}
        />
        <RecurrenceSelect
          id="task-recurrence"
          value={recurrence}
          onChange={setRecurrence}
          dueLocal={dueAt}
        />
        <ReminderFields
          id="task-reminder"
          dueLocal={dueAt}
          value={reminder}
          onChange={setReminder}
        />
      </div>

      <TaskFormMoreDetails
        open={detailsOpen}
        onToggle={() => setDetailsOpen((open) => !open)}
        summary={detailsSummary}
      >
        <CategorySelect
          id="task-category"
          categories={categories}
          value={categoryId}
          onChange={handleCategoryChange}
          className={compactFieldClassName}
          compact
        />
        <LabelSelect
          id="task-labels"
          labels={availableLabels}
          categories={categories}
          categoryId={categoryId}
          categoryIdsByLabelId={categoryIdsByLabelId}
          value={labelIds}
          onChange={(next) => {
            setLabelIds(next);
            if (next.length > 0) {
              setDetailsOpen(true);
            }
          }}
          onLabelCreated={(label) =>
            setExtraLabels((current) => [...current, label])
          }
        />
      </TaskFormMoreDetails>

      {error ? <p className={formErrorClassName}>{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          type="submit"
          disabled={loading}
          className={formPrimaryButtonClassName}
        >
          {loading ? "Adding..." : "Add task"}
        </button>
      </div>
    </form>
  );
}
