"use client";

import { CategorySelect } from "@/components/tasks/category-select";
import { DueDatetimeFields } from "@/components/tasks/due-datetime-fields";
import { LabelSelect } from "@/components/tasks/label-select";
import { ReminderFields } from "@/components/tasks/reminder-fields";
import {
  DEFAULT_TASK_PRIORITY,
  PrioritySelect,
} from "@/components/tasks/priority-select";
import type { Category } from "@/lib/categories/types";
import type { Label } from "@/lib/labels/types";
import { syncTaskLabels } from "@/lib/labels/sync-task-labels";
import { datetimeLocalValueToIso } from "@/lib/tasks/due-datetime";
import type { TaskPriority } from "@/lib/tasks/priority";
import {
  emptyReminderFormState,
  syncReminderFormWithDueLocal,
  toReminderDbColumns,
  type ReminderFormState,
} from "@/lib/tasks/reminder";
import { cardClassName, fieldClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AddTaskFormProps = {
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId?: Record<string, string[]>;
  showHeading?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
};

export function AddTaskForm({
  categories,
  labels,
  categoryIdsByLabelId = {},
  showHeading = true,
  embedded = false,
  onSuccess,
}: AddTaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reminder, setReminder] = useState<ReminderFormState>(
    emptyReminderFormState,
  );
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLabels = useMemo(() => {
    const merged = new Map<string, Label>();

    for (const label of [...labels, ...extraLabels]) {
      merged.set(label.id, label);
    }

    return [...merged.values()];
  }, [extraLabels, labels]);

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
    setCategoryId(null);
    setLabelIds([]);
    setExtraLabels([]);
    setLoading(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={embedded ? "space-y-3" : `${cardClassName} p-5`}
    >
      {showHeading ? (
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Add task
        </h2>
      ) : null}

      <div className={showHeading ? "mt-4 space-y-3" : "space-y-3"}>
        <div>
          <label
            htmlFor="task-title"
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Title
          </label>
          <input
            id="task-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClassName}
            placeholder="What needs doing?"
          />
        </div>

        <div>
          <label
            htmlFor="task-description"
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Description{" "}
            <span className="font-normal text-stone-400 dark:text-stone-500">
              (optional)
            </span>
          </label>
          <textarea
            id="task-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={`${fieldClassName} resize-none`}
            placeholder="Extra details"
          />
        </div>

        <DueDatetimeFields
          id="task-due-at"
          value={dueAt}
          onChange={handleDueChange}
        />

        <ReminderFields
          id="task-reminder"
          dueLocal={dueAt}
          value={reminder}
          onChange={setReminder}
        />

        <PrioritySelect
          id="task-priority"
          value={priority}
          onChange={setPriority}
        />

        <CategorySelect
          id="task-category"
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
        />

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
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Adding..." : "Add task"}
      </button>
    </form>
  );
}
