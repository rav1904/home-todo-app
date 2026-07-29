export type TaskStatusFilter = "all" | "open" | "completed";

export function parseStatusFilterParam(
  param: string | undefined,
): TaskStatusFilter {
  if (param === "open" || param === "completed") {
    return param;
  }

  return "all";
}

export function statusFilterToParam(
  filter: TaskStatusFilter,
): string | null {
  return filter === "all" ? null : filter;
}

export function isStatusFilterActive(filter: TaskStatusFilter) {
  return filter !== "all";
}

export function getStatusFilterLabel(
  filter: TaskStatusFilter,
): string | null {
  switch (filter) {
    case "all":
      return null;
    case "open":
      return "Open";
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
