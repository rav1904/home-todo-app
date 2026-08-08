"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
  resolveCategoryIdForSave,
  splitCategorySelection,
} from "@/lib/categories/tree";
import { fieldClassName, formLabelClassName } from "@/lib/ui/field-classes";

type CategorySelectProps = {
  id: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  categories: Category[];
  optional?: boolean;
  className?: string;
  compact?: boolean;
};

export function CategorySelect({
  id,
  value,
  onChange,
  categories,
  optional = true,
  className,
  compact = false,
}: CategorySelectProps) {
  const { mains, subsByParent } = buildCategoryTree(categories);
  const lookup = buildCategoryLookup(categories);
  const { mainCategoryId, subCategoryId } = splitCategorySelection(value, lookup);
  const subcategories = mainCategoryId
    ? (subsByParent[mainCategoryId] ?? [])
    : [];
  const showSubSelect = subcategories.length > 0;
  const selectClassName = className ?? fieldClassName;
  const labelClass = formLabelClassName;
  const stackClass = compact ? "space-y-2" : "space-y-3";

  return (
    <div className={stackClass}>
      <div>
        <label htmlFor={`${id}-main`} className={labelClass}>
          Category
          {optional ? (
            <span className="font-normal text-stone-400 dark:text-stone-500">
              {" "}
              · optional
            </span>
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
          <label htmlFor={`${id}-sub`} className={labelClass}>
            Subcategory
            <span className="font-normal text-stone-400 dark:text-stone-500">
              {" "}
              · optional
            </span>
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

type CategoryBadgeProps = {
  category: {
    label: string;
    colour: string;
    icon_name: string;
  } | null;
  unavailable?: boolean;
};

export function CategoryBadge({ category, unavailable = false }: CategoryBadgeProps) {
  if (unavailable) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium leading-none text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        Category unavailable
      </span>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none text-white"
      style={{ backgroundColor: category.colour }}
    >
      <CategoryIcon iconName={category.icon_name} className="h-3.5 w-3.5" />
      {category.label}
    </span>
  );
}
