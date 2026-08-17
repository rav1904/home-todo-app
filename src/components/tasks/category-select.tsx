"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
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
    <div className={`min-w-0 ${stackClass}`}>
      <div className="min-w-0">
        <label htmlFor={`${id}-main`} className={labelClass}>
          Workspace
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
          className={`${selectClassName} min-w-0 max-w-full`}
        >
          <option value="">None</option>
          {mains.map((main) => (
            <option key={main.id} value={main.id}>
              {formatCategoryNameForDisplay(main.name)}
            </option>
          ))}
        </select>
      </div>

      {showSubSelect ? (
        <div className="min-w-0">
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
            className={`${selectClassName} min-w-0 max-w-full`}
          >
            <option value="">None</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {formatCategoryNameForDisplay(subcategory.name)}
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
  /** Compact chip for dense task rows. */
  compact?: boolean;
};

export function CategoryBadge({
  category,
  unavailable = false,
  compact = false,
}: CategoryBadgeProps) {
  if (unavailable) {
    return (
      <span
        className={`inline-flex max-w-[9rem] shrink-0 items-center truncate rounded-md bg-stone-100 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400 ${
          compact
            ? "gap-1 px-1.5 py-0.5 text-[11px] leading-none"
            : "gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-none"
        }`}
      >
        Unavailable
      </span>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <span
      className={`inline-flex max-w-[9rem] shrink-0 items-center font-medium text-white ${
        compact
          ? "gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-none"
          : "gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-none"
      }`}
      style={{ backgroundColor: category.colour }}
      title={category.label}
    >
      <CategoryIcon
        iconName={category.icon_name}
        className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"}
      />
      <span className="truncate">{category.label}</span>
    </span>
  );
}
