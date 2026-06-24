"use client";

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

  async function handleToggle() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <input
      type="checkbox"
      checked={completed}
      onChange={handleToggle}
      disabled={loading}
      aria-label={`Mark "${title}" as ${completed ? "incomplete" : "complete"}`}
      className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}
