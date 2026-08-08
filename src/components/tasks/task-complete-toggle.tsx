"use client";

import {
  completeTaskWithRecurrence,
  uncompleteTask,
} from "@/lib/tasks/complete-with-recurrence";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskCompleteToggleProps = {
  id: string;
  completed: boolean;
  title: string;
};

export function TaskCompleteToggle({
  id,
  completed,
  title,
}: TaskCompleteToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    if (completed) {
      const { error: uncompleteError } = await uncompleteTask(supabase, id);
      if (uncompleteError) {
        console.error("[TaskCompleteToggle] uncomplete failed", {
          id,
          message: uncompleteError,
        });
        setError(uncompleteError);
        setLoading(false);
        return;
      }
    } else {
      const { data, error: completeError } = await completeTaskWithRecurrence(
        supabase,
        id,
      );
      if (completeError) {
        console.error("[TaskCompleteToggle] complete failed", {
          id,
          message: completeError,
        });
        setError(completeError);
        setLoading(false);
        return;
      }

      if (data?.next_task_id) {
        const message = "Next occurrence created.";
        console.info("[TaskCompleteToggle] next occurrence created", {
          id,
          next_task_id: data.next_task_id,
          next_due_at: data.next_due_at ?? null,
        });
        setSuccess(message);
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <span className="relative inline-flex shrink-0 flex-col items-start">
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggle}
        disabled={loading}
        aria-label={`Mark "${title}" as ${completed ? "incomplete" : "complete"}`}
        aria-invalid={error ? true : undefined}
        title={error ?? success ?? undefined}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-stone-300 text-accent focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {error ? (
        <span
          role="alert"
          className="absolute left-0 top-7 z-10 w-48 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm dark:bg-red-950/80 dark:text-red-300"
        >
          {error}
        </span>
      ) : null}
      {success ? (
        <span
          role="status"
          className="absolute left-0 top-7 z-10 w-48 rounded-md bg-accent-muted px-2 py-1 text-xs text-accent-ink shadow-sm dark:bg-accent-muted dark:text-accent-ink"
        >
          {success}
        </span>
      ) : null}
    </span>
  );
}
