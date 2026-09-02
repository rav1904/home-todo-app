"use client";

import {
  compactFieldClassName,
  formErrorClassName,
  formPrimaryButtonClassName,
} from "@/lib/ui/field-classes";
import {
  getNextSubtaskSortOrder,
  moveSubtask,
  toSubtaskSortOrderUpdates,
} from "@/lib/tasks/subtasks/sort";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskSubtaskListProps = {
  taskId: string;
  subtasks: TaskSubtask[];
  /** Hide the Checklist heading when a parent already shows progress. */
  hideHeading?: boolean;
  /** Slightly denser chrome for edit/add forms. */
  compact?: boolean;
};

export function TaskSubtaskList({
  taskId,
  subtasks,
  hideHeading = false,
  compact = false,
}: TaskSubtaskListProps) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistSortOrders(updates: { id: string; sort_order: number }[]) {
    const supabase = createClient();
    const timestamp = new Date().toISOString();

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("task_subtasks")
        .update({
          sort_order: update.sort_order,
          updated_at: timestamp,
        })
        .eq("id", update.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  async function handleAdd() {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      setError("Subtask title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to add subtasks.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("task_subtasks").insert({
      task_id: taskId,
      user_id: user.id,
      title: trimmedTitle,
      sort_order: getNextSubtaskSortOrder(subtasks),
      completed: false,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setNewTitle("");
    setLoading(false);
    router.refresh();
  }

  async function handleToggleComplete(subtask: TaskSubtask) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("task_subtasks")
      .update({
        completed: !subtask.completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtask.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  async function handleDelete(subtask: TaskSubtask) {
    if (!window.confirm(`Delete subtask "${subtask.title}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("task_subtasks")
      .delete()
      .eq("id", subtask.id);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    if (editingId === subtask.id) {
      setEditingId(null);
      setEditTitle("");
    }

    setLoading(false);
    router.refresh();
  }

  function startEditing(subtask: TaskSubtask) {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
  }

  async function handleSaveEdit(subtask: TaskSubtask) {
    const trimmedTitle = editTitle.trim();

    if (!trimmedTitle) {
      setError("Subtask title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("task_subtasks")
      .update({
        title: trimmedTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subtask.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setEditingId(null);
    setEditTitle("");
    setLoading(false);
    router.refresh();
  }

  async function handleMove(subtask: TaskSubtask, direction: "up" | "down") {
    const reordered = moveSubtask(subtasks, subtask.id, direction);

    if (reordered === subtasks) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await persistSortOrders(toSubtaskSortOrderUpdates(reordered));
      router.refresh();
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Could not reorder subtasks.",
      );
    } finally {
      setLoading(false);
    }
  }

  const actionButtonClassName = compact
    ? "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-stone-800 dark:hover:text-stone-200"
    : "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700";

  return (
    <div
      className={`min-w-0 ${
        hideHeading
          ? compact
            ? ""
            : "mt-2"
          : compact
            ? "rounded-lg bg-stone-50/80 p-2 dark:bg-stone-800/40"
            : "mt-4 border-t border-stone-200 pt-4 dark:border-stone-700"
      }`}
    >
      {hideHeading ? null : (
        <div className="mb-2">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Checklist
          </h3>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Optional · break the task into steps
          </p>
        </div>
      )}

      {subtasks.length > 0 ? (
        <ul
          className={
            compact
              ? "divide-y divide-stone-100 dark:divide-stone-800"
              : "space-y-2"
          }
        >
          {subtasks.map((subtask, index) => {
            const isEditing = editingId === subtask.id;

            return (
              <li
                key={subtask.id}
                className={
                  compact
                    ? "flex min-w-0 items-start gap-2 py-1.5"
                    : "flex min-w-0 items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-800/50"
                }
              >
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => void handleToggleComplete(subtask)}
                  disabled={loading}
                  aria-label={`Mark "${subtask.title}" as ${subtask.completed ? "incomplete" : "complete"}`}
                  className={`shrink-0 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                    compact ? "mt-0.5 h-4 w-4" : "mt-1 h-5 w-5"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSaveEdit(subtask);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className={`${compactFieldClassName} min-h-9 min-w-0 py-1.5`}
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(subtask)}
                          disabled={loading}
                          className="cursor-pointer rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={loading}
                          className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-stone-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(subtask)}
                      disabled={loading}
                      className={`w-full cursor-pointer text-left text-sm leading-snug break-words [overflow-wrap:anywhere] ${
                        subtask.completed
                          ? "text-stone-400 line-through dark:text-stone-500"
                          : "text-stone-800 dark:text-stone-100"
                      }`}
                    >
                      {subtask.title}
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void handleMove(subtask, "up")}
                      disabled={loading || index === 0}
                      aria-label={`Move "${subtask.title}" up`}
                      className={actionButtonClassName}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMove(subtask, "down")}
                      disabled={loading || index === subtasks.length - 1}
                      aria-label={`Move "${subtask.title}" down`}
                      className={actionButtonClassName}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(subtask)}
                      disabled={loading}
                      aria-label={`Delete "${subtask.title}"`}
                      className={`${actionButtonClassName} hover:text-red-700 dark:hover:text-red-400`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div
        className={`flex min-w-0 items-center gap-1.5 ${
          subtasks.length > 0 ? (compact ? "mt-2" : "mt-3") : ""
        }`}
      >
        <label htmlFor={`subtask-new-${taskId}`} className="sr-only">
          New checklist item
        </label>
        <input
          id={`subtask-new-${taskId}`}
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="Add a subtask…"
          className={`${compactFieldClassName} min-h-10 min-w-0 flex-1 ${
            compact ? "py-1.5" : "min-h-11"
          }`}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={loading}
          className={`${formPrimaryButtonClassName} ${
            compact ? "min-h-10 shrink-0 px-3 text-sm" : "min-h-11 shrink-0"
          }`}
        >
          Add
        </button>
      </div>

      {error ? <p className={`mt-2 ${formErrorClassName}`}>{error}</p> : null}
    </div>
  );
}
