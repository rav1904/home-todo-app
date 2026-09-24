import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";

export type CategorySortMode = "custom" | "az" | "za";

/** Case-insensitive compare by the name shown in the UI. Stable when names match. */
export function compareCategoryDisplayName(left: Category, right: Category) {
  return formatCategoryNameForDisplay(left.name).localeCompare(
    formatCategoryNameForDisplay(right.name),
    undefined,
    { sensitivity: "base", numeric: true },
  );
}

export function sortCategoriesByDisplayName(categories: Category[]) {
  return [...categories].sort(compareCategoryDisplayName);
}

export function sortCategories(
  categories: Category[],
  mode: CategorySortMode,
): Category[] {
  const copy = [...categories];

  if (mode === "az") {
    return copy.sort(compareCategoryDisplayName);
  }

  if (mode === "za") {
    return copy.sort((left, right) => compareCategoryDisplayName(right, left));
  }

  return copy.sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}

export function getNextSortOrder(
  categories: Category[],
  parentId: string | null,
) {
  const siblings = categories.filter(
    (category) => category.parent_id === parentId,
  );

  if (siblings.length === 0) {
    return 0;
  }

  return Math.max(...siblings.map((category) => category.sort_order)) + 1;
}

export function reorderSiblings(
  siblings: Category[],
  sourceId: string,
  targetId: string,
) {
  const sourceIndex = siblings.findIndex((category) => category.id === sourceId);
  const targetIndex = siblings.findIndex((category) => category.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return siblings;
  }

  const reordered = [...siblings];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  return reordered;
}

export function moveSibling(
  siblings: Category[],
  categoryId: string,
  direction: "up" | "down",
) {
  const index = siblings.findIndex((category) => category.id === categoryId);

  if (index === -1) {
    return siblings;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return siblings;
  }

  const reordered = [...siblings];
  [reordered[index], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[index],
  ];

  return reordered;
}

export function toSortOrderUpdates(categories: Category[]) {
  return categories.map((category, index) => ({
    id: category.id,
    sort_order: index,
  }));
}
