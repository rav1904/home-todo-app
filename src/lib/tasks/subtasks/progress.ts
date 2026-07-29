import type { TaskSubtask } from "@/lib/tasks/subtasks/types";

export type SubtaskProgress = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

export function getSubtaskProgress(
  subtasks: TaskSubtask[],
): SubtaskProgress | null {
  if (subtasks.length === 0) {
    return null;
  }

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;

  return {
    completedCount,
    totalCount: subtasks.length,
    percent: Math.round((completedCount / subtasks.length) * 100),
  };
}
