"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import { buildCategoryTree } from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import { toggleCategoryId } from "@/lib/labels/category-links";
import { useMemo } from "react";

type LabelCategoryLinkFieldsProps = {
  categories: Category[];
  value: string[];
  onChange: (categoryIds: string[]) => void;
  idPrefix: string;
  disabled?: boolean;
};

export function LabelCategoryLinkFields({
  categories,
  value,
  onChange,
  idPrefix,
  disabled = false,
}: LabelCategoryLinkFieldsProps) {
  const { mains, subsByParent } = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  if (categories.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        No categories available to link. Create categories first.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
        Linked categories
      </p>
      <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
        Choose which main categories and subcategories this global label
        belongs to. Task pickers will use these links in a later update.
      </p>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
        {mains.map((main) => {
          const subs = subsByParent[main.id] ?? [];
          const mainChecked = value.includes(main.id);

          return (
            <div key={main.id}>
              <label
                htmlFor={`${idPrefix}-category-${main.id}`}
                className="flex cursor-pointer items-center gap-2 text-sm text-stone-800 dark:text-stone-200"
              >
                <input
                  id={`${idPrefix}-category-${main.id}`}
                  type="checkbox"
                  checked={mainChecked}
                  disabled={disabled}
                  onChange={() => onChange(toggleCategoryId(value, main.id))}
                  className="h-4 w-4 cursor-pointer rounded border-stone-300 text-accent focus:ring-accent/20"
                />
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: main.colour }}
                >
                  <CategoryIcon
                    iconName={main.icon_name}
                    className="h-3 w-3"
                  />
                </span>
                <span className="font-medium">{main.name}</span>
              </label>

              {subs.length > 0 ? (
                <div className="mt-2 space-y-2 border-l border-stone-200 pl-4 ml-2 dark:border-stone-600">
                  {subs.map((sub) => {
                    const subChecked = value.includes(sub.id);

                    return (
                      <label
                        key={sub.id}
                        htmlFor={`${idPrefix}-category-${sub.id}`}
                        className="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
                      >
                        <input
                          id={`${idPrefix}-category-${sub.id}`}
                          type="checkbox"
                          checked={subChecked}
                          disabled={disabled}
                          onChange={() =>
                            onChange(toggleCategoryId(value, sub.id))
                          }
                          className="h-4 w-4 cursor-pointer rounded border-stone-300 text-accent focus:ring-accent/20"
                        />
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: sub.colour }}
                        >
                          <CategoryIcon
                            iconName={sub.icon_name}
                            className="h-3 w-3"
                          />
                        </span>
                        <span>{sub.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
