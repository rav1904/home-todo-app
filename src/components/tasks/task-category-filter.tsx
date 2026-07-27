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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

const selectClassName =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

type TaskCategoryFilterBarProps = {
  categories: Category[];
};

function pushFilter(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  filter: TaskCategoryFilter,
) {
  const param = categoryFilterToParam(filter);
  const nextParams = new URLSearchParams();

  if (param) {
    nextParams.set("category", param);
  }

  const query = nextParams.toString();
  router.push(query ? `${pathname}?${query}` : pathname);
}

export function TaskCategoryFilterBar({ categories }: TaskCategoryFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") ?? undefined;

  const { mains, subsByParent } = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );
  const lookup = useMemo(() => buildCategoryLookup(categories), [categories]);

  const filter = parseCategoryFilterParam(categoryParam, lookup);

  const mainSelectValue =
    filter.type === "all"
      ? "all"
      : filter.type === "uncategorized"
        ? UNCategorized_FILTER_VALUE
        : filter.type === "main"
          ? filter.mainCategoryId
          : (lookup.get(filter.subCategoryId)?.parent_id ?? "all");

  const subCategoryId = filter.type === "sub" ? filter.subCategoryId : null;

  const subcategories =
    mainSelectValue === "all" || mainSelectValue === UNCategorized_FILTER_VALUE
      ? []
      : (subsByParent[mainSelectValue] ?? []);

  const showSubSelect = subcategories.length > 0;
  const filterDisplay = getCategoryFilterDisplay(filter, lookup);
  const selectedMain = lookup.get(mainSelectValue);
  const subLabel = selectedMain ? `All in ${selectedMain.name}` : "All subcategories";

  function handleMainChange(value: string) {
    if (value === "all") {
      pushFilter(router, pathname, { type: "all" });
      return;
    }

    if (value === UNCategorized_FILTER_VALUE) {
      pushFilter(router, pathname, { type: "uncategorized" });
      return;
    }

    pushFilter(router, pathname, { type: "main", mainCategoryId: value });
  }

  function handleSubChange(value: string) {
    if (!value) {
      if (
        mainSelectValue !== "all" &&
        mainSelectValue !== UNCategorized_FILTER_VALUE
      ) {
        pushFilter(router, pathname, {
          type: "main",
          mainCategoryId: mainSelectValue,
        });
      }
      return;
    }

    pushFilter(router, pathname, { type: "sub", subCategoryId: value });
  }

  function clearFilter() {
    pushFilter(router, pathname, { type: "all" });
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Filter by category</h2>
          <p className="mt-1 text-sm text-stone-500">
            Narrow the list by main category, subcategory, or uncategorized tasks.
          </p>
        </div>

        {filter.type !== "all" ? (
          <button
            type="button"
            onClick={clearFilter}
            className="shrink-0 cursor-pointer self-start rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            className={selectClassName}
          >
            <option value="all">All tasks</option>
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
              className={selectClassName}
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
      </div>

      {filter.type === "uncategorized" ? (
        <p className="mt-3 text-sm text-stone-600">
          Showing tasks with no category assigned.
        </p>
      ) : null}

      {filterDisplay ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: filterDisplay.colour }}
          >
            <CategoryIcon
              iconName={filterDisplay.icon_name}
              className="h-3.5 w-3.5"
            />
            {filterDisplay.label}
          </span>
          {filter.type === "main" && subcategories.length > 0 ? (
            <span>including all subcategories</span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
