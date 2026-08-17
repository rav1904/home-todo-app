export type TaskStatusFilter = "all" | "open" | "completed";

/** Default list view: incomplete tasks only. */
export const DEFAULT_TASK_STATUS_FILTER: TaskStatusFilter = "open";

export function parseStatusFilterParam(
  param: string | undefined,
): TaskStatusFilter {
  if (param === "all" || param === "completed" || param === "open") {
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
  }
}

export function filterTasksByStatus<T extends { completed: boolean }>(
  tasks: T[],
  filter: TaskStatusFilter,
): T[] {
  switch (filter) {
    case "all":
      return tasks;
    case "open":
      return tasks.filter((task) => !task.completed);
    case "completed":
      return tasks.filter((task) => task.completed);
  }
}
