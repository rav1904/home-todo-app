import type { SupabaseClient } from "@supabase/supabase-js";

export type CancellableTaskLike = {
  completed: boolean;
  cancelled_at?: string | null;
};

/** True when the task has been soft-cancelled (not completed). */
export function isTaskCancelled(
  task: Pick<CancellableTaskLike, "cancelled_at">,
): boolean {
  return Boolean(task.cancelled_at);
}

/** Open = not completed and not cancelled. */
export function isTaskOpen(task: CancellableTaskLike): boolean {
  return !task.completed && !isTaskCancelled(task);
}

/**
 * Soft-cancel a task. Does not set completed and does not call
 * complete_task_with_recurrence (no next occurrence spawn).
 */
export async function cancelTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { error: userError.message };
  }

  if (!user) {
    return { error: "You must be signed in to cancel a task." };
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("tasks")
    .select("id, completed, cancelled_at")
    .eq("id", taskId)
    .maybeSingle();

  if (snapshotError) {
    return { error: snapshotError.message };
  }

  if (!snapshot) {
    return { error: "Task not found." };
  }

  if (snapshot.completed) {
    return { error: "Completed tasks cannot be cancelled. Reopen them first." };
  }

  if (snapshot.cancelled_at) {
    return { error: null };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", taskId)
    .eq("completed", false)
    .is("cancelled_at", null);

  return { error: error?.message ?? null };
}

/** Clear cancel fields so the task returns to Open (if not completed). */
export async function restoreCancelledTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: string | null }> {
  const { data: snapshot, error: snapshotError } = await supabase
    .from("tasks")
    .select("id, cancelled_at")
    .eq("id", taskId)
    .maybeSingle();

  if (snapshotError) {
    return { error: snapshotError.message };
  }

  if (!snapshot) {
    return { error: "Task not found." };
  }

  if (!snapshot.cancelled_at) {
    return { error: null };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq("id", taskId)
    .not("cancelled_at", "is", null);

  return { error: error?.message ?? null };
}
