"use client";

import {
  CATEGORY_COLOUR_PRESETS,
  DEFAULT_CATEGORY_COLOUR,
} from "@/lib/categories/colours";
import {
  CATEGORY_ICON_NAMES,
  CategoryIcon,
} from "@/lib/categories/icons";
import type { CategoryFormValues } from "@/lib/categories/types";
import { fieldClassName } from "@/lib/ui/field-classes";

type CategoryFormFieldsProps = {
  values: CategoryFormValues;
  onChange: (values: CategoryFormValues) => void;
  mainCategories: { id: string; name: string }[];
  showParentSelect: boolean;
  idPrefix: string;
};

export function CategoryFormFields({
  values,
  onChange,
  mainCategories,
  showParentSelect,
  idPrefix,
}: CategoryFormFieldsProps) {
  return (
    <div className="space-y-4">
      {showParentSelect ? (
        <div>
          <label
            htmlFor={`${idPrefix}-parent`}
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Parent category
          </label>
          <select
            id={`${idPrefix}-parent`}
            value={values.parent_id ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                parent_id: event.target.value || null,
              })
            }
            className={fieldClassName}
          >
            <option value="">Top-level category</option>
            {mainCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Only top-level categories can be parents. Categories with
            subcategories cannot be nested under another category.
          </p>
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`${idPrefix}-name`}
          className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          value={values.name}
          onChange={(event) =>
            onChange({ ...values, name: event.target.value })
          }
          className={fieldClassName}
          placeholder="Category name"
        />
      </div>

      {!values.parent_id ? (
        <div>
          <label
            htmlFor={`${idPrefix}-admin-note`}
            className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Admin note (optional)
          </label>
          <input
            id={`${idPrefix}-admin-note`}
            type="text"
            value={values.admin_note}
            onChange={(event) =>
              onChange({ ...values, admin_note: event.target.value })
            }
            className={fieldClassName}
            placeholder="e.g. Shopping category for User X only"
            maxLength={200}
          />
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
            Helps distinguish shared categories with similar names. Not shown to
            non-admin users.
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">Icon</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {CATEGORY_ICON_NAMES.map((iconName) => {
            const isSelected = values.icon_name === iconName;

            return (
              <button
                key={iconName}
                type="button"
                aria-label={`Select ${iconName} icon`}
                aria-pressed={isSelected}
                onClick={() => onChange({ ...values, icon_name: iconName })}
                className={`flex h-10 items-center justify-center rounded-xl border transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                }`}
              >
                <CategoryIcon iconName={iconName} className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">Colour</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOUR_PRESETS.map((preset) => {
            const isSelected = values.colour === preset.value;

            return (
              <button
                key={preset.value}
                type="button"
                aria-label={`Select ${preset.label} colour`}
                aria-pressed={isSelected}
                onClick={() => onChange({ ...values, colour: preset.value })}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  isSelected
                    ? "border-stone-900 dark:border-stone-100"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: preset.value }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function createEmptyCategoryFormValues(
  parentId: string | null = null,
): CategoryFormValues {
  return {
    name: "",
    colour: DEFAULT_CATEGORY_COLOUR,
    icon_name: CATEGORY_ICON_NAMES[0],
    parent_id: parentId,
    admin_note: "",
  };
}
