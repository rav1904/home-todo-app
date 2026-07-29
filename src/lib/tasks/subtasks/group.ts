import { sortSubtasks } from "@/lib/tasks/subtasks/sort";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TASK_SUBTASK_SELECT_FIELDS } from "@/lib/tasks/subtasks/types";

export function groupSubtasksByTaskId(rows: TaskSubtask[]) {
  const grouped: Record<string, TaskSubtask[]> = {};

  for (const row of rows) {
    if (!grouped[row.task_id]) {
      grouped[row.task_id] = [];
    }

    grouped[row.task_id].push(row);
  }

  for (const taskId of Object.keys(grouped)) {
    grouped[taskId] = sortSubtasks(grouped[taskId]);
  }

  return grouped;
}

export async function fetchSubtasksByTaskId(
  supabase: SupabaseClient,
  taskIds: string[],
) {
  if (taskIds.length === 0) {
    return { subtasksByTaskId: {}, error: null };
  }

  const { data, error } = await supabase
    .from("task_subtasks")
    .select(TASK_SUBTASK_SELECT_FIELDS)
    .in("task_id", taskIds)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return { subtasksByTaskId: {}, error: error.message };
  }

  return {
    subtasksByTaskId: groupSubtasksByTaskId((data ?? []) as TaskSubtask[]),
    error: null,
  };
}
