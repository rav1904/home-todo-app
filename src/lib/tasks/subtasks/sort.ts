import type { TaskSubtask } from "@/lib/tasks/subtasks/types";

export function sortSubtasks(subtasks: TaskSubtask[]) {
  return [...subtasks].sort(
    (left, right) =>
      left.sort_order - right.sort_order ||
      left.title.localeCompare(right.title),
  );
}

export function getNextSubtaskSortOrder(subtasks: TaskSubtask[]) {
  if (subtasks.length === 0) {
    return 0;
  }

  return Math.max(...subtasks.map((subtask) => subtask.sort_order)) + 1;
}

export function moveSubtask(
  subtasks: TaskSubtask[],
  subtaskId: string,
  direction: "up" | "down",
) {
  const sorted = sortSubtasks(subtasks);
  const index = sorted.findIndex((subtask) => subtask.id === subtaskId);

  if (index === -1) {
    return sorted;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= sorted.length) {
    return sorted;
  }

  const reordered = [...sorted];
  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];

  return reordered;
}

export function toSubtaskSortOrderUpdates(subtasks: TaskSubtask[]) {
  return subtasks.map((subtask, index) => ({
    id: subtask.id,
    sort_order: index,
  }));
}
