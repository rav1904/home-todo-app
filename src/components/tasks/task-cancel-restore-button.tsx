"use client";

import { LoadingButton } from "@/components/ui/loading-button";
import { Spinner } from "@/components/ui/spinner";
import { cancelTask, restoreCancelledTask } from "@/lib/tasks/cancel";
import { createClient } from "@/lib/supabase/client";
import { taskActionButtonClassName } from "@/lib/ui/field-classes";
import { Ban, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type TaskCancelRestoreButtonProps = {
  id: string;
  title: string;
  cancelled: boolean;
  onDone?: () => void;
  /** Icon control for task rows; form = labeled button for Edit Task. */
  variant?: "icon" | "form";
  /** Extra disable (e.g. while Save is pending). */
  disabled?: boolean;
};

export function TaskCancelRestoreButton({
  id,
  title,
  cancelled,
  onDone,
  variant = "icon",
  disabled = false,
}: TaskCancelRestoreButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function handleClick() {
    if (inFlightRef.current || loading || disabled) {
      return;
    }

    if (!cancelled) {
      if (
        !window.confirm(
          "Cancel this task? It will be hidden from open tasks but kept in history.",
        )
      ) {
        return;
      }
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: actionError } = cancelled
      ? await restoreCancelledTask(supabase, id)
      : await cancelTask(supabase, id);

    if (actionError) {
      setError(actionError);
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    router.refresh();
    onDone?.();
    setLoading(false);
    inFlightRef.current = false;
  }

  const actionLabel = cancelled ? "Restore task" : "Cancel task";
  const pendingLabel = cancelled ? "Restoring…" : "Cancelling…";

  if (variant === "form") {
    return (
      <div className="min-w-0 space-y-1.5">
        <LoadingButton
          type="button"
          onClick={handleClick}
          loading={loading}
          disabled={disabled}
          idleLabel={
            <span className="inline-flex items-center gap-1.5">
              {cancelled ? (
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <Ban className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {actionLabel}
            </span>
          }
          loadingLabel={pendingLabel}
          minLabelWidthClassName="min-w-[8.5rem]"
          aria-label={
            loading
              ? `${pendingLabel} "${title}"`
              : `${actionLabel} "${title}"`
          }
          className={`inline-flex min-h-11 w-full max-w-full cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
            cancelled
              ? "border-stone-200 bg-white text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50 dark:border-stone-600 dark:bg-stone-900 dark:text-emerald-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40"
              : "border-stone-200 bg-white text-amber-900 hover:border-amber-200 hover:bg-amber-50 dark:border-stone-600 dark:bg-stone-900 dark:text-amber-200 dark:hover:border-amber-800 dark:hover:bg-amber-950/40"
          }`}
        />
        {error ? (
          <p
            role="alert"
            className="break-words text-xs text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        aria-busy={loading || undefined}
        aria-label={
          loading
            ? `${pendingLabel}`
            : actionLabel
        }
        title={loading ? pendingLabel : actionLabel}
        className={`${taskActionButtonClassName} ${
          cancelled
            ? "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
            : "hover:bg-amber-50 hover:text-amber-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <Spinner className="h-4 w-4" />
        ) : cancelled ? (
          <RotateCcw className="h-4 w-4" aria-hidden />
        ) : (
          <Ban className="h-4 w-4" aria-hidden />
        )}
      </button>
      {error ? (
        <span
          role="alert"
          className="absolute top-10 right-0 z-10 w-44 break-words rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm dark:bg-red-950/80 dark:text-red-300"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
