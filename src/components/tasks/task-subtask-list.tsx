"use client";

import { fieldClassName } from "@/lib/ui/field-classes";
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
};

export function TaskSubtaskList({ taskId, subtasks }: TaskSubtaskListProps) {
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

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    setError(null);
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

    cancelEditing();
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

  return (
    <div className="mt-4 border-t border-stone-200 pt-4 dark:border-stone-700">
      <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
        Checklist
      </h3>

      {subtasks.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {subtasks.map((subtask, index) => {
            const isEditing = editingId === subtask.id;

            return (
              <li
                key={subtask.id}
                className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 dark:border-stone-700 dark:bg-stone-800/50"
              >
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => void handleToggleComplete(subtask)}
                  disabled={loading}
                  aria-label={`Mark "${subtask.title}" as ${subtask.completed ? "incomplete" : "complete"}`}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveEdit(subtask);
                      }}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className={fieldClassName}
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={loading}
                          className="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(subtask)}
                      disabled={loading}
                      className={`w-full cursor-pointer text-left text-sm ${
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
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => void handleMove(subtask, "up")}
                      disabled={loading || index === 0}
                      aria-label={`Move "${subtask.title}" up`}
                      className="cursor-pointer rounded border border-stone-200 bg-white p-0.5 text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMove(subtask, "down")}
                      disabled={loading || index === subtasks.length - 1}
                      aria-label={`Move "${subtask.title}" down`}
                      className="cursor-pointer rounded border border-stone-200 bg-white p-0.5 text-stone-500 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(subtask)}
                      disabled={loading}
                      aria-label={`Delete "${subtask.title}"`}
                      className="cursor-pointer rounded border border-stone-200 bg-white p-0.5 text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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

      <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Add a subtask..."
          className={fieldClassName}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {error ? (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
