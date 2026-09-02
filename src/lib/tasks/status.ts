import { isTaskCancelled, isTaskOpen } from "@/lib/tasks/cancel";

export type TaskStatusFilter = "all" | "open" | "completed" | "cancelled";

/** Default list view: incomplete, non-cancelled tasks only. */
export const DEFAULT_TASK_STATUS_FILTER: TaskStatusFilter = "open";

export function parseStatusFilterParam(
  param: string | undefined,
): TaskStatusFilter {
  if (
    param === "all" ||
    param === "completed" ||
    param === "open" ||
    param === "cancelled"
  ) {
    return param;
  }

  return DEFAULT_TASK_STATUS_FILTER;
}

/** Omit the default (open) from the URL for clean task-list links. */
export function statusFilterToParam(
  filter: TaskStatusFilter,
): string | null {
  return filter === DEFAULT_TASK_STATUS_FILTER ? null : filter;
}

export function isStatusFilterActive(filter: TaskStatusFilter) {
  return filter !== DEFAULT_TASK_STATUS_FILTER;
}

export function getStatusFilterLabel(
  filter: TaskStatusFilter,
): string | null {
  switch (filter) {
    case "open":
      return null;
    case "all":
      return "All";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

type StatusTaskLike = {
  completed: boolean;
  cancelled_at?: string | null;
};

export function filterTasksByStatus<T extends StatusTaskLike>(
  tasks: T[],
  filter: TaskStatusFilter,
): T[] {
  switch (filter) {
    case "all":
      return tasks;
    case "open":
      return tasks.filter((task) => isTaskOpen(task));
    case "completed":
      return tasks.filter((task) => task.completed);
    case "cancelled":
      return tasks.filter((task) => isTaskCancelled(task));
  }
}
