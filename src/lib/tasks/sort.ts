import {
  comparePriorityDesc,
  parseTaskPriority,
} from "@/lib/tasks/priority";

export type TaskSortOption =
  | "due_asc"
  | "created_desc"
  | "created_asc"
  | "title_asc"
  | "priority_desc";

export const DEFAULT_TASK_SORT: TaskSortOption = "created_desc";

export function parseSortParam(param: string | undefined): TaskSortOption {
  if (
    param === "due_asc" ||
    param === "created_desc" ||
    param === "created_asc" ||
    param === "title_asc" ||
    param === "priority_desc"
  ) {
    return param;
  }

  return DEFAULT_TASK_SORT;
}

export function sortOptionToParam(sort: TaskSortOption): string | null {
  return sort === DEFAULT_TASK_SORT ? null : sort;
}

export function isSortOptionActive(sort: TaskSortOption) {
  return sort !== DEFAULT_TASK_SORT;
}

export function getSortOptionLabel(sort: TaskSortOption): string | null {
  switch (sort) {
    case "created_desc":
      return null;
    case "due_asc":
      return "Due soonest";
    case "created_asc":
      return "Created oldest";
    case "title_asc":
      return "Title A–Z";
    case "priority_desc":
      return "Priority";
  }
}

export function sortTasks<
  T extends {
    title: string;
    due_at: string | null;
    created_at: string;
    priority?: string | null;
  },
>(tasks: T[], sort: TaskSortOption): T[] {
  const copy = [...tasks];

  switch (sort) {
    case "due_asc":
      return copy.sort((left, right) => {
        if (left.due_at === null && right.due_at === null) {
          return (
            new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime()
          );
        }

        if (left.due_at === null) {
          return 1;
        }

        if (right.due_at === null) {
          return -1;
        }

        const dueDiff =
          new Date(left.due_at).getTime() - new Date(right.due_at).getTime();

        if (dueDiff !== 0) {
          return dueDiff;
        }

        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      });

    case "created_asc":
      return copy.sort(
        (left, right) =>
          new Date(left.created_at).getTime() -
          new Date(right.created_at).getTime(),
      );

    case "title_asc":
      return copy.sort(
        (left, right) =>
          left.title.localeCompare(right.title, undefined, {
            sensitivity: "base",
          }) ||
          new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime(),
      );

    case "priority_desc":
      return copy.sort((left, right) => {
        const priorityDiff = comparePriorityDesc(
          parseTaskPriority(left.priority),
          parseTaskPriority(right.priority),
        );

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return (
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
        );
      });

    case "created_desc":
    default:
      return copy.sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      );
  }
}
