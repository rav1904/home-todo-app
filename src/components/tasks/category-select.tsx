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
    name?: string;
    colour: string;
    icon_name: string;
  } | null;
  unavailable?: boolean;
  /** Compact chip for dense task rows. */
  compact?: boolean;
  /** Quiet row chip: colour pip + muted label so the title stays dominant. */
  muted?: boolean;
  className?: string;
};

export function CategoryBadge({
  category,
  unavailable = false,
  compact = false,
  muted = false,
  className = "",
}: CategoryBadgeProps) {
  const sizeClass = compact
    ? "gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-none"
    : "gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-none";

  if (unavailable) {
    return (
      <span
        className={`inline-flex max-w-[6.5rem] shrink-0 items-center truncate font-medium text-stone-500 dark:text-stone-400 ${
          muted
            ? "border border-stone-200/80 bg-stone-50 dark:border-stone-700 dark:bg-stone-900"
            : "bg-stone-100 dark:bg-stone-800"
        } ${sizeClass} ${className}`}
      >
        Unavailable
      </span>
    );
  }

  if (!category) {
    return null;
  }

  const displayName = formatCategoryNameForDisplay(
    compact
      ? (category.name ?? category.label.split(">").pop()?.trim() ?? category.label)
      : category.label,
  );

  if (muted) {
    return (
      <span
        className={`inline-flex max-w-[6.5rem] shrink-0 items-center border border-stone-200/80 bg-stone-50 font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 ${sizeClass} ${className}`}
        title={category.label}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: category.colour }}
          aria-hidden
        />
        <span className="truncate">{displayName}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex max-w-[6.5rem] shrink-0 items-center font-medium text-white ${sizeClass} ${className}`}
      style={{ backgroundColor: category.colour }}
      title={category.label}
    >
      <CategoryIcon
        iconName={category.icon_name}
        className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"}
      />
      <span className="truncate">{displayName}</span>
    </span>
  );
}
