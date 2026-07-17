"use client";

import { TaskCompleteToggle } from "@/components/tasks/task-complete-toggle";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskListItemProps = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completed: boolean;
  createdAt: string;
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

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const fieldClassName =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

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
  completed,
  createdAt,
}: TaskListItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editDueAt, setEditDueAt] = useState(toDatetimeLocalValue(dueAt));
  const [editCompleted, setEditCompleted] = useState(completed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setEditTitle(title);
    setEditDescription(description ?? "");
    setEditDueAt(toDatetimeLocalValue(dueAt));
    setEditCompleted(completed);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setError(null);
    setIsEditing(false);
  }

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
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: trimmedTitle,
        description: editDescription.trim() || null,
        due_at: editDueAt ? new Date(editDueAt).toISOString() : null,
        completed: editCompleted,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setIsEditing(false);
    setLoading(false);
    router.refresh();
  }

  if (isEditing) {
    return (
      <li className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
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

          <div>
            <label
              htmlFor={`edit-due-at-${id}`}
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Due date{" "}
              <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id={`edit-due-at-${id}`}
              type="datetime-local"
              value={editDueAt}
              onChange={(event) => setEditDueAt(event.target.value)}
              className={fieldClassName}
            />
          </div>

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
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <TaskCompleteToggle
          id={id}
          completed={completed}
          title={title}
        />
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2
              className={`text-base font-semibold text-stone-900 ${
                completed ? "line-through text-stone-400" : ""
              }`}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-stone-600">{description}</p>
            ) : null}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              completed
                ? "bg-stone-100 text-stone-600"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {completed ? "Completed" : "Open"}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
          <div>
            <dt className="sr-only">Due</dt>
            <dd>Due: {dueAt ? formatDateTime(dueAt) : "No due date"}</dd>
          </div>
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
            className="shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:bg-stone-50 hover:text-stone-900"
          >
            <PencilIcon />
          </button>
          <TaskDeleteButton id={id} title={title} />
        </div>
      </div>
    </li>
  );
}
