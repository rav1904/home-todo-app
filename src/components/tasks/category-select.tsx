"use client";

import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
  resolveCategoryIdForSave,
  splitCategorySelection,
} from "@/lib/categories/tree";

const defaultSelectClassName =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

type CategorySelectProps = {
  id: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  categories: Category[];
  optional?: boolean;
  className?: string;
};

export function CategorySelect({
  id,
  value,
  onChange,
  categories,
  optional = true,
  className,
}: CategorySelectProps) {
  const { mains, subsByParent } = buildCategoryTree(categories);
  const lookup = buildCategoryLookup(categories);
  const { mainCategoryId, subCategoryId } = splitCategorySelection(value, lookup);
  const subcategories = mainCategoryId
    ? (subsByParent[mainCategoryId] ?? [])
    : [];
  const showSubSelect = subcategories.length > 0;
  const selectClassName = className ?? defaultSelectClassName;

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={`${id}-main`}
          className="mb-1.5 block text-sm font-medium text-stone-700"
        >
          Main category{" "}
          {optional ? (
            <span className="font-normal text-stone-400">(optional)</span>
          ) : null}
        </label>
        <select
          id={`${id}-main`}
          value={mainCategoryId ?? ""}
          onChange={(event) => {
            const nextMainId = event.target.value ? event.target.value : null;
            onChange(nextMainId);
          }}
          className={selectClassName}
        >
          <option value="">None</option>
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
            htmlFor={`${id}-sub`}
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            Subcategory{" "}
            <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select
            id={`${id}-sub`}
            value={subCategoryId ?? ""}
            onChange={(event) => {
              const nextSubId = event.target.value ? event.target.value : null;
              onChange(resolveCategoryIdForSave(mainCategoryId, nextSubId));
            }}
            className={selectClassName}
          >
            <option value="">None</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

