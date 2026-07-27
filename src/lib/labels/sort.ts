import type { Label } from "@/lib/labels/types";

export type LabelSortMode = "custom" | "az" | "za";

export function sortLabels(labels: Label[], mode: LabelSortMode): Label[] {
  const copy = [...labels];

  if (mode === "az") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (mode === "za") {
    return copy.sort((a, b) => b.name.localeCompare(a.name));
  }

  return copy.sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}

export function getNextLabelSortOrder(labels: Label[]) {
  if (labels.length === 0) {
    return 0;
  }

  return Math.max(...labels.map((label) => label.sort_order)) + 1;
}

export function reorderLabels(
  labels: Label[],
  sourceId: string,
  targetId: string,
) {
  const sourceIndex = labels.findIndex((label) => label.id === sourceId);
  const targetIndex = labels.findIndex((label) => label.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return labels;
  }

  const reordered = [...labels];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  return reordered;
}

export function moveLabel(
  labels: Label[],
  labelId: string,
  direction: "up" | "down",
) {
  const index = labels.findIndex((label) => label.id === labelId);

  if (index === -1) {
    return labels;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= labels.length) {
    return labels;
  }

  const reordered = [...labels];
  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];

  return reordered;
}

export function toLabelSortOrderUpdates(labels: Label[]) {
  return labels.map((label, index) => ({
    id: label.id,
    sort_order: index,
  }));
}
