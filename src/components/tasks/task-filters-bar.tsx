"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import {
  getCategoryFilterDisplay,
  parseCategoryFilterParam,
  type TaskCategoryFilter,
  UNCategorized_FILTER_VALUE,
} from "@/lib/categories/filter";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
} from "@/lib/categories/tree";
import {
  getLabelFilterDisplay,
  NO_LABEL_FILTER_VALUE,
  parseLabelFilterParam,
  type TaskLabelFilter,
} from "@/lib/labels/filter";
import { groupLabelsForPicker } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import {
  buildTasksFilterUrl,
  type TasksListQueryState,
} from "@/lib/tasks/filter";
import { parseSearchQueryParam } from "@/lib/tasks/search";
import {
  DEFAULT_TASK_SORT,
  parseSortParam,
  type TaskSortOption,
} from "@/lib/tasks/sort";
import {
  parseStatusFilterParam,
  type TaskStatusFilter,
} from "@/lib/tasks/status";
import { fieldClassName } from "@/lib/ui/field-classes";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type TaskFiltersBarProps = {
  categories: Category[];
  labels: Label[];
};

export function TaskFiltersBar({ categories, labels }: TaskFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") ?? undefined;
  const labelParam = searchParams.get("label") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const sortParam = searchParams.get("sort") ?? undefined;
  const qParam = searchParams.get("q") ?? undefined;

  const { mains, subsByParent } = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );
  const categoryLookup = useMemo(
    () => buildCategoryLookup(categories),
    [categories],
  );
  const labelLookup = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels],
  );
  const { global, personal } = useMemo(
    () => groupLabelsForPicker(labels),
    [labels],
  );

  const categoryFilter = parseCategoryFilterParam(categoryParam, categoryLookup);
  const labelFilter = parseLabelFilterParam(labelParam, labelLookup);
  const statusFilter = parseStatusFilterParam(statusParam);
  const sort = parseSortParam(sortParam);
  const searchQuery = parseSearchQueryParam(qParam);

  const [searchDraft, setSearchDraft] = useState(searchQuery);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  useEffect(() => {
    setSearchDraft(qParam ?? "");
  }, [qParam]);

  useEffect(() => {
    const trimmedDraft = searchDraft.trim();
    const trimmedCurrent = parseSearchQueryParam(qParam);

    if (trimmedDraft === trimmedCurrent) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());

      if (trimmedDraft) {
        params.set("q", trimmedDraft);
      } else {
        params.delete("q");
      }

      // Search/filter URL state should not keep a deep-link edit target.
      params.delete("edit");

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchDraft, qParam, pathname, router]);

  const mainSelectValue =
    categoryFilter.type === "all"
      ? "all"
      : categoryFilter.type === "uncategorized"
        ? UNCategorized_FILTER_VALUE
        : categoryFilter.type === "main"
          ? categoryFilter.mainCategoryId
          : (categoryLookup.get(categoryFilter.subCategoryId)?.parent_id ?? "all");

  const subCategoryId =
    categoryFilter.type === "sub" ? categoryFilter.subCategoryId : null;

  const subcategories =
    mainSelectValue === "all" || mainSelectValue === UNCategorized_FILTER_VALUE
      ? []
      : (subsByParent[mainSelectValue] ?? []);

  const showSubSelect = subcategories.length > 0;
  const categoryFilterDisplay = getCategoryFilterDisplay(
    categoryFilter,
    categoryLookup,
  );
  const labelFilterDisplay = getLabelFilterDisplay(labelFilter, labelLookup);
  const selectedMain = categoryLookup.get(mainSelectValue);
  const subLabel = selectedMain
    ? `All in ${selectedMain.name}`
    : "All subcategories";

  const labelSelectValue =
    labelFilter.type === "all"
      ? "all"
      : labelFilter.type === "none"
        ? NO_LABEL_FILTER_VALUE
        : labelFilter.labelId;

  const categoryFilterActive = categoryFilter.type !== "all";
  const labelFilterActive = labelFilter.type !== "all";
  const statusFilterActive = statusFilter !== "all";
  const searchActive = searchQuery.length > 0;
  const sortActive = sort !== DEFAULT_TASK_SORT;
  const anyFilterActive =
    categoryFilterActive ||
    labelFilterActive ||
    statusFilterActive ||
    searchActive ||
    sortActive;

  function navigate(next: TasksListQueryState) {
    router.push(buildTasksFilterUrl(pathname, next));
  }

  function withCurrent(overrides: Partial<TasksListQueryState>) {
    navigate({
      categoryFilter,
      labelFilter,
      statusFilter,
      searchQuery,
      sort,
      ...overrides,
    });
  }

  function handleMainChange(value: string) {
    let nextCategory: TaskCategoryFilter = { type: "all" };

    if (value === UNCategorized_FILTER_VALUE) {
      nextCategory = { type: "uncategorized" };
    } else if (value !== "all") {
      nextCategory = { type: "main", mainCategoryId: value };
    }

    withCurrent({ categoryFilter: nextCategory });
  }

  function handleSubChange(value: string) {
    if (!value) {
      if (
        mainSelectValue !== "all" &&
        mainSelectValue !== UNCategorized_FILTER_VALUE
      ) {
        withCurrent({
          categoryFilter: { type: "main", mainCategoryId: mainSelectValue },
        });
      }
      return;
    }

    withCurrent({
      categoryFilter: { type: "sub", subCategoryId: value },
    });
  }

  function handleLabelChange(value: string) {
    let nextLabel: TaskLabelFilter = { type: "all" };

    if (value === NO_LABEL_FILTER_VALUE) {
      nextLabel = { type: "none" };
    } else if (value !== "all") {
      nextLabel = { type: "label", labelId: value };
    }

    withCurrent({ labelFilter: nextLabel });
  }

  function handleStatusChange(value: string) {
    withCurrent({
      statusFilter: parseStatusFilterParam(value) as TaskStatusFilter,
    });
  }

  function handleSortChange(value: string) {
    withCurrent({
      sort: parseSortParam(value) as TaskSortOption,
    });
  }

  function clearFilters() {
    setSearchDraft("");
    router.push(pathname);
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Search & filters
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Search, status, category, and label use AND logic. Sort changes list
            order.
          </p>
        </div>

        {anyFilterActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 cursor-pointer self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label
            htmlFor="task-filter-search"
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Search
          </label>
          <input
            id="task-filter-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search title or description"
            className={fieldClassName}
          />
        </div>

        <div>
          <label
            htmlFor="task-filter-status"
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Status
          </label>
          <select
            id="task-filter-status"
            value={statusFilter}
            onChange={(event) => handleStatusChange(event.target.value)}
            className={fieldClassName}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="task-filter-sort"
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Sort
          </label>
          <select
            id="task-filter-sort"
            value={sort}
            onChange={(event) => handleSortChange(event.target.value)}
            className={fieldClassName}
          >
            <option value="due_asc">Due date soonest</option>
            <option value="created_desc">Created newest</option>
            <option value="created_asc">Created oldest</option>
            <option value="title_asc">Title A–Z</option>
          </select>
        </div>

        {categories.length > 0 ? (
          <>
            <div>
              <label
                htmlFor="task-filter-main"
                className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
              >
                Category
              </label>
              <select
                id="task-filter-main"
                value={mainSelectValue}
                onChange={(event) => handleMainChange(event.target.value)}
                className={fieldClassName}
              >
                <option value="all">All categories</option>
                <option value={UNCategorized_FILTER_VALUE}>Uncategorized</option>
                {mains.map((main) => (
                  <option key={main.id} value={main.id}>
                    {main.name}
                  </option>
                ))}
              </select>
            </div>

            {showSubSelect ? (
              <div>
                <label
                  htmlFor="task-filter-sub"
                  className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Subcategory
                </label>
                <select
                  id="task-filter-sub"
                  value={subCategoryId ?? ""}
                  onChange={(event) => handleSubChange(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="">{subLabel}</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        ) : null}

        {labels.length > 0 ? (
          <div>
            <label
              htmlFor="task-filter-label"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Label
            </label>
            <select
              id="task-filter-label"
              value={labelSelectValue}
              onChange={(event) => handleLabelChange(event.target.value)}
              className={fieldClassName}
            >
              <option value="all">All labels</option>
              <option value={NO_LABEL_FILTER_VALUE}>No labels</option>
              {global.length > 0 ? (
                <optgroup label="Shared labels">
                  {global.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {personal.length > 0 ? (
                <optgroup label="My labels">
                  {personal.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        ) : null}
      </div>

      {categoryFilter.type === "uncategorized" ? (
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Category filter: tasks with no category assigned.
        </p>
      ) : null}

      {labelFilter.type === "none" ? (
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Label filter: tasks with no labels assigned.
        </p>
      ) : null}

      {categoryFilterDisplay || labelFilterDisplay || searchActive || statusFilterActive ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          {searchActive ? (
            <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
              Search: {searchQuery}
            </span>
          ) : null}
          {statusFilterActive ? (
            <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
              {statusFilter === "open" ? "Open" : "Completed"}
            </span>
          ) : null}
          {categoryFilterDisplay ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: categoryFilterDisplay.colour }}
            >
              <CategoryIcon
                iconName={categoryFilterDisplay.icon_name}
                className="h-3.5 w-3.5"
              />
              {categoryFilterDisplay.label}
            </span>
          ) : null}
          {labelFilterDisplay ? (
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: labelFilterDisplay.colour }}
            >
              {labelFilterDisplay.name}
            </span>
          ) : null}
          {categoryFilterActive && labelFilterActive ? (
            <span>matching both category and label</span>
          ) : null}
          {categoryFilter.type === "main" && subcategories.length > 0 ? (
            <span>including all subcategories</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
