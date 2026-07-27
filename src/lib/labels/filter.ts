import type { Label } from "@/lib/labels/types";

export type TaskLabelFilter =
  | { type: "all" }
  | { type: "none" }
  | { type: "label"; labelId: string };

export const NO_LABEL_FILTER_VALUE = "none";

export function parseLabelFilterParam(
  labelParam: string | undefined,
  lookup: Map<string, Label>,
): TaskLabelFilter {
  if (!labelParam) {
    return { type: "all" };
  }

  if (labelParam === NO_LABEL_FILTER_VALUE) {
    return { type: "none" };
  }

  if (lookup.has(labelParam)) {
    return { type: "label", labelId: labelParam };
  }

  return { type: "all" };
}

export function labelFilterToParam(filter: TaskLabelFilter): string | null {
  switch (filter.type) {
    case "all":
      return null;
    case "none":
      return NO_LABEL_FILTER_VALUE;
    case "label":
      return filter.labelId;
  }
}

export function filterTasksByLabel<T extends { id: string }>(
  tasks: T[],
  filter: TaskLabelFilter,
  labelIdsByTaskId: Record<string, string[]>,
): T[] {
  switch (filter.type) {
    case "all":
      return tasks;
    case "none":
      return tasks.filter((task) => (labelIdsByTaskId[task.id] ?? []).length === 0);
    case "label":
      return tasks.filter((task) =>
        (labelIdsByTaskId[task.id] ?? []).includes(filter.labelId),
      );
  }
}

export function isLabelFilterActive(filter: TaskLabelFilter) {
  return filter.type !== "all";
}

export function getLabelFilterLabel(
  filter: TaskLabelFilter,
  lookup: Map<string, Label>,
): string | null {
  switch (filter.type) {
    case "all":
      return null;
    case "none":
      return "No labels";
    case "label":
      return lookup.get(filter.labelId)?.name ?? null;
  }
}

export function getLabelFilterDisplay(
  filter: TaskLabelFilter,
  lookup: Map<string, Label>,
): Label | null {
  if (filter.type !== "label") {
    return null;
  }

  return lookup.get(filter.labelId) ?? null;
}
