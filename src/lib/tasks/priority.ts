export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const DEFAULT_TASK_PRIORITY: TaskPriority = "medium";

export const TASK_PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

export function parseTaskPriority(value: unknown): TaskPriority {
  return isTaskPriority(value) ? value : DEFAULT_TASK_PRIORITY;
}

export function getPriorityRank(priority: TaskPriority): number {
  return PRIORITY_RANK[priority];
}

export function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "urgent":
      return "Urgent";
  }
}

/** Badge styles for task cards — light and dark. */
export function getPriorityBadgeClassName(priority: TaskPriority): string {
  switch (priority) {
    case "low":
      return "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400";
    case "medium":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "high":
      return "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "urgent":
      return "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  }
}

/** Dot colour for compact calendar chips (high/urgent only). */
export function getPriorityChipDotClassName(
  priority: TaskPriority,
): string | null {
  if (priority === "high") {
    return "bg-amber-500 dark:bg-amber-400";
  }

  if (priority === "urgent") {
    return "bg-rose-500 dark:bg-rose-400";
  }

  return null;
}

export function comparePriorityDesc(
  left: TaskPriority,
  right: TaskPriority,
): number {
  return getPriorityRank(right) - getPriorityRank(left);
}
