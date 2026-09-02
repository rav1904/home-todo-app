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
import {
  getSearchQueryLabel,
  isSearchQueryActive,
  searchQueryToParam,
  type TaskSearchQuery,
} from "@/lib/tasks/search";
import {
  DEFAULT_TASK_SORT,
  getSortOptionLabel,
  isSortOptionActive,
  sortOptionToParam,
  type TaskSortOption,
} from "@/lib/tasks/sort";
import {
  assigneeFilterToParam,
  isAssigneeFilterActive,
  type TaskAssigneeFilter,
} from "@/lib/tasks/assignee-filter";
import {
  getStatusFilterLabel,
  isStatusFilterActive,
  statusFilterToParam,
  type TaskStatusFilter,
} from "@/lib/tasks/status";

export type TasksListQueryState = {
  categoryFilter: TaskCategoryFilter;
  labelFilter: TaskLabelFilter;
  statusFilter: TaskStatusFilter;
  assigneeFilter: TaskAssigneeFilter;
  searchQuery: TaskSearchQuery;
  sort: TaskSortOption;
};

export function buildTasksFilterUrl(
  pathname: string,
  state: TasksListQueryState,
) {
  const params = new URLSearchParams();
  const categoryParam = categoryFilterToParam(state.categoryFilter);
  const labelParam = labelFilterToParam(state.labelFilter);
  const statusParam = statusFilterToParam(state.statusFilter);
  const assigneeParam = assigneeFilterToParam(state.assigneeFilter);
  const searchParam = searchQueryToParam(state.searchQuery);
  const sortParam = sortOptionToParam(state.sort);

  if (searchParam) {
    params.set("q", searchParam);
  }

  if (statusParam) {
    params.set("status", statusParam);
  }

  if (sortParam) {
    params.set("sort", sortParam);
  }

  if (categoryParam) {
    params.set("category", categoryParam);
  }

  if (labelParam) {
    params.set("label", labelParam);
  }

  if (assigneeParam) {
    params.set("assignee", assigneeParam);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isAnyTaskFilterActive(state: TasksListQueryState) {
  return (
    isCategoryFilterActive(state.categoryFilter) ||
    isLabelFilterActive(state.labelFilter) ||
    isStatusFilterActive(state.statusFilter) ||
    isAssigneeFilterActive(state.assigneeFilter) ||
    isSearchQueryActive(state.searchQuery) ||
    isSortOptionActive(state.sort)
  );
}

export function getTaskFilterDescription(
  state: TasksListQueryState,
  categoryLookup: Map<string, Category>,
  labelLookup: Map<string, Label>,
  subsByParent: Record<string, Category[]>,
) {
  const parts = [
    getSearchQueryLabel(state.searchQuery),
    getStatusFilterLabel(state.statusFilter),
    getCategoryFilterLabel(
      state.categoryFilter,
      categoryLookup,
      subsByParent,
    ),
    getLabelFilterLabel(state.labelFilter, labelLookup),
    getSortOptionLabel(state.sort),
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" + ");
}

export {
  DEFAULT_TASK_SORT,
  parseCategoryFilterParam,
  parseLabelFilterParam,
  type TaskCategoryFilter,
  type TaskLabelFilter,
  type TaskSearchQuery,
  type TaskSortOption,
  type TaskStatusFilter,
};
