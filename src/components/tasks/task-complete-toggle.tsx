"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  completeTaskWithRecurrence,
  uncompleteTask,
} from "@/lib/tasks/complete-with-recurrence";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  const inFlightRef = useRef(false);

  async function handleToggle() {
    if (inFlightRef.current || loading) {
      return;
    }

    inFlightRef.current = true;
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
        inFlightRef.current = false;
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
        inFlightRef.current = false;
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
    inFlightRef.current = false;
  }

  const pendingLabel = completed ? "Reopening…" : "Completing…";

  return (
    <span className="relative inline-flex shrink-0 flex-col items-start">
      <span className="relative inline-flex h-11 w-11 items-center justify-center">
        <input
          type="checkbox"
          checked={completed}
          onChange={handleToggle}
          disabled={loading}
          aria-busy={loading || undefined}
          aria-label={
            loading
              ? `${pendingLabel} "${title}"`
              : `Mark "${title}" as ${completed ? "incomplete" : "complete"}`
          }
          aria-invalid={error ? true : undefined}
          title={error ?? success ?? (loading ? pendingLabel : undefined)}
          className={`h-6 w-6 shrink-0 cursor-pointer rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed ${
            loading ? "opacity-40" : "disabled:opacity-60"
          }`}
        />
        {loading ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Spinner className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
          </span>
        ) : null}
      </span>
      {loading ? (
        <span
          role="status"
          className="absolute top-10 left-0 z-10 max-w-[9rem] rounded-md bg-stone-900/90 px-2 py-1 text-xs font-medium text-white shadow-sm dark:bg-stone-100 dark:text-stone-900"
        >
          {pendingLabel}
        </span>
      ) : null}
      {error ? (
        <span
          role="alert"
          className="absolute top-10 left-0 z-10 w-48 break-words rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm dark:bg-red-950/80 dark:text-red-300"
        >
          {error}
        </span>
      ) : null}
      {success && !loading ? (
        <span
          role="status"
          className="absolute top-10 left-0 z-10 w-48 break-words rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800 shadow-sm dark:bg-emerald-950/80 dark:text-emerald-300"
        >
          {success}
        </span>
      ) : null}
    </span>
  );
}
