import type { TaskCreatorProfile } from "@/lib/tasks/creators";

export type TaskAssigneeFilter =
  | { type: "all" }
  | { type: "me" }
  | { type: "unassigned" }
  | { type: "user"; userId: string };

export const DEFAULT_TASK_ASSIGNEE_FILTER: TaskAssigneeFilter = { type: "all" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AssignedTaskLike = {
  assigned_to?: string | null;
};

export function parseAssigneeFilterParam(
  param: string | undefined,
  currentUserId: string,
): TaskAssigneeFilter {
  if (!param || param === "all" || param === "everyone") {
    return DEFAULT_TASK_ASSIGNEE_FILTER;
  }
  if (param === "unassigned") {
    return { type: "unassigned" };
  }
  if (param === "me" || param === currentUserId) {
    return { type: "me" };
  }
  if (UUID_PATTERN.test(param)) {
    return { type: "user", userId: param };
  }
  return DEFAULT_TASK_ASSIGNEE_FILTER;
}

/** Omit the default (everyone) from the URL. */
export function assigneeFilterToParam(filter: TaskAssigneeFilter): string | null {
  switch (filter.type) {
    case "all":
      return null;
    case "me":
      return "me";
    case "unassigned":
      return "unassigned";
    case "user":
      return filter.userId;
  }
}

export function isAssigneeFilterActive(filter: TaskAssigneeFilter) {
  return filter.type !== "all";
}

export function filterTasksByAssignee<T extends AssignedTaskLike>(
  tasks: T[],
  filter: TaskAssigneeFilter,
  currentUserId: string,
): T[] {
  switch (filter.type) {
    case "all":
      return tasks;
    case "unassigned":
      return tasks.filter((task) => !task.assigned_to);
    case "me":
      return tasks.filter((task) => task.assigned_to === currentUserId);
    case "user":
      return tasks.filter((task) => task.assigned_to === filter.userId);
  }
}

/** Distinct assignees on already-visible tasks, excluding the current user (covered by Me). */
export function collectAssigneeFilterPeople(
  tasks: AssignedTaskLike[],
  peopleByUserId: Record<string, TaskCreatorProfile>,
  currentUserId: string,
): TaskCreatorProfile[] {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.assigned_to && task.assigned_to !== currentUserId) {
      ids.add(task.assigned_to);
    }
  }

  return [...ids]
    .map(
      (id) =>
        peopleByUserId[id] ?? {
          id,
          email: null,
          displayName: "Member",
          avatarUrl: null,
        },
    )
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, undefined, {
        sensitivity: "base",
      }),
    );
}

export function assigneeFiltersEqual(
  left: TaskAssigneeFilter,
  right: TaskAssigneeFilter,
) {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "user" && right.type === "user") {
    return left.userId === right.userId;
  }
  return true;
}
