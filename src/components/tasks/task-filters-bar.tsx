"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import {
  getCategoryFilterDisplay,
  parseCategoryFilterParam,
  type TaskCategoryFilter,
  UNCategorized_FILTER_VALUE,
} from "@/lib/categories/filter";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
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
import {
  compactFieldClassName,
  densePanelClassName,
  fieldClassName,
  filterChipActiveClassName,
  filterChipClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFilterChips } from "@/components/tasks/workspace-filter-chips";

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const workspaceChipId =
    categoryFilter.type === "all" || categoryFilter.type === "uncategorized"
      ? "all"
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

  const statusFilterActive = statusFilter !== "open";
  const labelFilterActive = labelFilter.type !== "all";
  const categoryFilterActive = categoryFilter.type !== "all";
  const searchActive = searchQuery.length > 0;
  const sortActive = sort !== DEFAULT_TASK_SORT;
  const anyFilterActive =
    categoryFilterActive ||
    labelFilterActive ||
    statusFilterActive ||
    searchActive ||
    sortActive;
  const advancedActive =
    labelFilterActive ||
    sortActive ||
    categoryFilter.type === "uncategorized" ||
    categoryFilter.type === "sub";

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

  function handleWorkspaceSelect(id: string) {
    if (id === "all") {
      withCurrent({ categoryFilter: { type: "all" } });
      return;
    }
    withCurrent({
      categoryFilter: { type: "main", mainCategoryId: id },
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
    <section className={`${densePanelClassName} space-y-2.5 p-3`}>
      {categories.length > 0 ? (
        <WorkspaceFilterChips
          categories={categories}
          activeId={workspaceChipId}
          onSelect={handleWorkspaceSelect}
        />
      ) : null}

      <div
        className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Status filter"
      >
        {(
          [
            { id: "open", label: "Open" },
            { id: "completed", label: "Completed" },
            { id: "all", label: "All" },
          ] as const
        ).map((option) => {
          const selected = statusFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => handleStatusChange(option.id)}
              className={`${filterChipClassName} ${
                selected ? filterChipActiveClassName : filterChipIdleClassName
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-[12rem]">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <label htmlFor="task-filter-search" className="sr-only">
            Search
          </label>
          <input
            id="task-filter-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search tasks"
            className={`${compactFieldClassName} pl-8`}
          />
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          More filters
          {advancedActive ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          ) : null}
          {advancedOpen ? (
            <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
          )}
        </button>

        {anyFilterActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 transition hover:text-stone-800 dark:hover:text-stone-200"
          >
            Clear
          </button>
        ) : null}
      </div>

      {advancedOpen ? (
        <div className="grid gap-2.5 border-t border-stone-100 pt-2.5 sm:grid-cols-2 lg:grid-cols-3 dark:border-stone-800">
          <div>
            <label
              htmlFor="task-filter-sort"
              className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
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
              <option value="priority_desc">Priority</option>
            </select>
          </div>

          {categories.length > 0 ? (
            <>
              <div>
                <label
                  htmlFor="task-filter-main"
                  className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
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
                      {formatCategoryNameForDisplay(main.name)}
                    </option>
                  ))}
                </select>
              </div>

              {showSubSelect ? (
                <div>
                  <label
                    htmlFor="task-filter-sub"
                    className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
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
                        {formatCategoryNameForDisplay(subcategory.name)}
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
                className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
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
      ) : null}

      {categoryFilterDisplay ||
      labelFilterDisplay ||
      searchActive ||
      statusFilterActive ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
          {searchActive ? (
            <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-medium text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
              Search: {searchQuery}
            </span>
          ) : null}
          {statusFilterActive ? (
            <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-medium text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200">
              {statusFilter === "completed" ? "Completed" : "All"}
            </span>
          ) : null}
          {categoryFilterDisplay ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-white"
              style={{ backgroundColor: categoryFilterDisplay.colour }}
            >
              <CategoryIcon
                iconName={categoryFilterDisplay.icon_name}
                className="h-3 w-3"
              />
              {categoryFilterDisplay.label}
            </span>
          ) : null}
          {labelFilterDisplay ? (
            <span
              className="inline-flex rounded-full px-2 py-0.5 font-medium text-white"
              style={{ backgroundColor: labelFilterDisplay.colour }}
            >
              {labelFilterDisplay.name}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
