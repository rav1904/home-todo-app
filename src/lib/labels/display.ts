import { sortLabels } from "@/lib/labels/sort";
import type { Label } from "@/lib/labels/types";

export type GroupedLabels = {
  global: Label[];
  personal: Label[];
};

export function groupLabelsForPicker(labels: Label[]): GroupedLabels {
  return {
    global: sortLabels(
      labels.filter((label) => label.scope === "global"),
      "custom",
    ),
    personal: sortLabels(
      labels.filter((label) => label.scope === "personal"),
      "custom",
    ),
  };
}

export function buildLabelLookup(labels: Label[]) {
  return new Map(labels.map((label) => [label.id, label]));
}

export type TaskLabelDisplay = {
  labels: Label[];
  unavailableCount: number;
};

export function resolveTaskLabelDisplay(
  labelIds: string[],
  lookup: Map<string, Label>,
): TaskLabelDisplay {
  const labels: Label[] = [];
  let unavailableCount = 0;

  for (const labelId of labelIds) {
    const label = lookup.get(labelId);

    if (label) {
      labels.push(label);
    } else {
      unavailableCount += 1;
    }
  }

  labels.sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  return { labels, unavailableCount };
}

export function findPersonalLabelByName(labels: Label[], name: string) {
  const normalized = name.trim().toLowerCase();

  return labels.find(
    (label) =>
      label.scope === "personal" &&
      label.name.trim().toLowerCase() === normalized,
  );
}
