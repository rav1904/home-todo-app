import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_TASK_RECURRENCE,
  parseTaskRecurrence,
} from "@/lib/tasks/recurrence";

export type CompleteTaskWithRecurrenceResult = {
  ok: boolean;
  already_completed?: boolean;
  next_task_id?: string | null;
  recurrence?: string | null;
  due_at?: string | null;
  next_due_at?: string | null;
  duplicate_prevented?: boolean;
  error?: string;
};

type TaskRecurrenceSnapshot = {
  recurrence: string | null;
  due_at: string | null;
  completed: boolean;
};

/** Complete an open task via RPC (spawns next occurrence when recurring). */
export async function completeTaskWithRecurrence(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ data: CompleteTaskWithRecurrenceResult | null; error: string | null }> {
  const { data: snapshot, error: snapshotError } = await supabase
    .from("tasks")
    .select("recurrence, due_at, completed")
    .eq("id", taskId)
    .maybeSingle();

  if (snapshotError) {
    console.error("[completeTaskWithRecurrence] snapshot failed", {
      taskId,
      message: snapshotError.message,
    });
    return { data: null, error: snapshotError.message };
  }

  const before = snapshot as TaskRecurrenceSnapshot | null;
  const recurrence = parseTaskRecurrence(before?.recurrence);
  const dueAt = before?.due_at ?? null;

  console.info("[completeTaskWithRecurrence] before", {
    taskId,
    recurrence,
    due_at: dueAt,
    completed: before?.completed ?? null,
  });

  const { data, error } = await supabase.rpc("complete_task_with_recurrence", {
    p_task_id: taskId,
  });

  if (error) {
    console.error("[completeTaskWithRecurrence] rpc error", {
      taskId,
      recurrence,
      due_at: dueAt,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { data: null, error: error.message };
  }

  const result = data as CompleteTaskWithRecurrenceResult | null;
  if (!result?.ok) {
    const message = result?.error ?? "Could not complete task.";
    console.error("[completeTaskWithRecurrence] rpc returned not ok", {
      taskId,
      recurrence,
      due_at: dueAt,
      result,
    });
    return { data: result, error: message };
  }

  const expectsSpawn =
    recurrence !== DEFAULT_TASK_RECURRENCE && dueAt !== null && !before?.completed;

  if (expectsSpawn && !result.next_task_id) {
    const message =
      "Task completed but no next occurrence was created. Check recurrence and due date.";
    console.error("[completeTaskWithRecurrence] missing next_task_id", {
      taskId,
      recurrence,
      due_at: dueAt,
      result,
    });
    return { data: result, error: message };
  }

  console.info("[completeTaskWithRecurrence] ok", {
    taskId,
    recurrence: result.recurrence ?? recurrence,
    due_at: result.due_at ?? dueAt,
    next_due_at: result.next_due_at ?? null,
    next_task_id: result.next_task_id ?? null,
    already_completed: result.already_completed ?? false,
    duplicate_prevented: result.duplicate_prevented ?? false,
  });

  return { data: result, error: null };
}

/** Uncomplete only — does not delete a previously spawned next occurrence. */
export async function uncompleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("tasks")
    .update({ completed: false })
    .eq("id", taskId);

  return { error: error?.message ?? null };
}
