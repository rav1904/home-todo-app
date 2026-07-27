import type { CategoryDisplay } from "@/lib/categories/tree";
import { getCategoryDisplay } from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";

export type TaskCategoryFilter =
  | { type: "all" }
  | { type: "uncategorized" }
  | { type: "main"; mainCategoryId: string }
  | { type: "sub"; subCategoryId: string };

export const UNCategorized_FILTER_VALUE = "uncategorized";

type TaskWithCategory = {
  category_id: string | null;
};

export function parseCategoryFilterParam(
  categoryParam: string | undefined,
  lookup: Map<string, Category>,
): TaskCategoryFilter {
  if (!categoryParam) {
    return { type: "all" };
  }

  if (categoryParam === UNCategorized_FILTER_VALUE) {
    return { type: "uncategorized" };
  }

  const category = lookup.get(categoryParam);

  if (!category) {
    return { type: "all" };
  }

  if (category.parent_id) {
    return { type: "sub", subCategoryId: category.id };
  }

  return { type: "main", mainCategoryId: category.id };
}

export function categoryFilterToParam(filter: TaskCategoryFilter): string | null {
  switch (filter.type) {
    case "all":
      return null;
    case "uncategorized":
      return UNCategorized_FILTER_VALUE;
    case "main":
      return filter.mainCategoryId;
    case "sub":
      return filter.subCategoryId;
  }
}

export function filterTasksByCategory<T extends TaskWithCategory>(
  tasks: T[],
  filter: TaskCategoryFilter,
  subsByParent: Record<string, Category[]>,
): T[] {
  switch (filter.type) {
    case "all":
      return tasks;
    case "uncategorized":
      return tasks.filter((task) => task.category_id === null);
    case "sub":
      return tasks.filter((task) => task.category_id === filter.subCategoryId);
    case "main": {
      const subIds = (subsByParent[filter.mainCategoryId] ?? []).map(
        (subcategory) => subcategory.id,
      );
      const allowedIds = new Set([filter.mainCategoryId, ...subIds]);

      return tasks.filter(
        (task) =>
          task.category_id !== null && allowedIds.has(task.category_id),
      );
    }
  }
}

export function isCategoryFilterActive(filter: TaskCategoryFilter) {
  return filter.type !== "all";
}

export function getCategoryFilterLabel(
  filter: TaskCategoryFilter,
  lookup: Map<string, Category>,
  subsByParent: Record<string, Category[]>,
): string | null {
  switch (filter.type) {
    case "all":
      return null;
    case "uncategorized":
      return "Uncategorized";
    case "main": {
      const main = lookup.get(filter.mainCategoryId);
      const subCount = subsByParent[filter.mainCategoryId]?.length ?? 0;
      if (!main) {
        return null;
      }

      return subCount > 0 ? `${main.name} (all)` : main.name;
    }
    case "sub": {
      const display = getCategoryDisplay(filter.subCategoryId, lookup);
      return display?.label ?? null;
    }
  }
}

export function getCategoryFilterDisplay(
  filter: TaskCategoryFilter,
  lookup: Map<string, Category>,
): CategoryDisplay | null {
  switch (filter.type) {
    case "all":
    case "uncategorized":
      return null;
    case "main":
      return getCategoryDisplay(filter.mainCategoryId, lookup);
    case "sub":
      return getCategoryDisplay(filter.subCategoryId, lookup);
  }
}
