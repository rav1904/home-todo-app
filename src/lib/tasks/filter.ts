import {
  categoryFilterToParam,
  getCategoryFilterLabel,
  isCategoryFilterActive,
  parseCategoryFilterParam,
  type TaskCategoryFilter,
} from "@/lib/categories/filter";
import type { Category } from "@/lib/categories/types";
import {
  getLabelFilterLabel,
  isLabelFilterActive,
  labelFilterToParam,
  parseLabelFilterParam,
  type TaskLabelFilter,
} from "@/lib/labels/filter";
import type { Label } from "@/lib/labels/types";

export function buildTasksFilterUrl(
  pathname: string,
  categoryFilter: TaskCategoryFilter,
  labelFilter: TaskLabelFilter,
) {
  const params = new URLSearchParams();
  const categoryParam = categoryFilterToParam(categoryFilter);
  const labelParam = labelFilterToParam(labelFilter);

  if (categoryParam) {
    params.set("category", categoryParam);
  }

  if (labelParam) {
    params.set("label", labelParam);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isAnyTaskFilterActive(
  categoryFilter: TaskCategoryFilter,
  labelFilter: TaskLabelFilter,
) {
  return isCategoryFilterActive(categoryFilter) || isLabelFilterActive(labelFilter);
}

export function getTaskFilterDescription(
  categoryFilter: TaskCategoryFilter,
  labelFilter: TaskLabelFilter,
  categoryLookup: Map<string, Category>,
  labelLookup: Map<string, Label>,
  subsByParent: Record<string, Category[]>,
) {
  const parts = [
    getCategoryFilterLabel(categoryFilter, categoryLookup, subsByParent),
    getLabelFilterLabel(labelFilter, labelLookup),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" + ");
}

export {
  parseCategoryFilterParam,
  parseLabelFilterParam,
  type TaskCategoryFilter,
  type TaskLabelFilter,
};
