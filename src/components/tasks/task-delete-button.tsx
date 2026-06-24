"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TaskDeleteButtonProps = {
  id: string;
  title: string;
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

export function TaskDeleteButton({ id, title }: TaskDeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"?`)) {
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      aria-label={loading ? `Deleting "${title}"` : `Delete "${title}"`}
      className="shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <TrashIcon />
    </button>
  );
}
