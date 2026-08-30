"use client";

import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { taskActionButtonClassName } from "@/lib/ui/field-classes";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type TaskDeleteButtonProps = {
  id: string;
  title: string;
  onDeleted?: () => void;
  variant?: "default" | "ghost";
};

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function TaskDeleteButton({
  id,
  title,
  onDeleted,
  variant = "default",
}: TaskDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function handleDelete() {
    if (inFlightRef.current || loading) {
      return;
    }

    if (!window.confirm(`Delete "${title}"?`)) {
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      inFlightRef.current = false;
      return;
    }

    router.refresh();
    onDeleted?.();
    setLoading(false);
    inFlightRef.current = false;
  }

  const className =
    variant === "ghost"
      ? `${taskActionButtonClassName} hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/40 dark:hover:text-rose-400`
      : "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-400";

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        aria-busy={loading || undefined}
        aria-label={loading ? `Deleting "${title}"` : `Delete "${title}"`}
        title={loading ? "Deleting…" : "Delete"}
        className={className}
      >
        {loading ? <Spinner className="h-4 w-4" /> : <TrashIcon />}
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
