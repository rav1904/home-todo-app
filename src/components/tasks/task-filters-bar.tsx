"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import {
  categoryFilterToParam,
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
  labelFilterToParam,
  NO_LABEL_FILTER_VALUE,
  parseLabelFilterParam,
  type TaskLabelFilter,
} from "@/lib/labels/filter";
import { groupLabelsForPicker } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import { fieldClassName } from "@/lib/ui/field-classes";
import { buildTasksFilterUrl } from "@/lib/tasks/filter";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";


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
  const anyFilterActive = categoryFilterActive || labelFilterActive;

  function navigate(nextCategory: TaskCategoryFilter, nextLabel: TaskLabelFilter) {
    router.push(buildTasksFilterUrl(pathname, nextCategory, nextLabel));
  }

  function handleMainChange(value: string) {
    let nextCategory: TaskCategoryFilter = { type: "all" };

    if (value === UNCategorized_FILTER_VALUE) {
      nextCategory = { type: "uncategorized" };
    } else if (value !== "all") {
      nextCategory = { type: "main", mainCategoryId: value };
    }

    navigate(nextCategory, labelFilter);
  }

  function handleSubChange(value: string) {
    if (!value) {
      if (
        mainSelectValue !== "all" &&
        mainSelectValue !== UNCategorized_FILTER_VALUE
      ) {
        navigate(
          { type: "main", mainCategoryId: mainSelectValue },
          labelFilter,
        );
      }
      return;
    }

    navigate({ type: "sub", subCategoryId: value }, labelFilter);
  }

  function handleLabelChange(value: string) {
    let nextLabel: TaskLabelFilter = { type: "all" };

    if (value === NO_LABEL_FILTER_VALUE) {
      nextLabel = { type: "none" };
    } else if (value !== "all") {
      nextLabel = { type: "label", labelId: value };
    }

    navigate(categoryFilter, nextLabel);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Filters</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Filter by category, label, or both. Multiple filters use AND logic.
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
        {categories.length > 0 ? (
          <>
            <div>
              <label
                htmlFor="task-filter-main"
                className="mb-1.5 block text-sm font-medium text-stone-700"
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
                  className="mb-1.5 block text-sm font-medium text-stone-700"
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
              className="mb-1.5 block text-sm font-medium text-stone-700"
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
        <p className="mt-3 text-sm text-stone-600">
          Category filter: tasks with no category assigned.
        </p>
      ) : null}

      {labelFilter.type === "none" ? (
        <p className="mt-3 text-sm text-stone-600">
          Label filter: tasks with no labels assigned.
        </p>
      ) : null}

      {categoryFilterDisplay || labelFilterDisplay ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
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
            <span>matching both filters</span>
          ) : null}
          {categoryFilter.type === "main" && subcategories.length > 0 ? (
            <span>including all subcategories</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
