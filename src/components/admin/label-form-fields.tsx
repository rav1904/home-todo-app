"use client";

import {
  CATEGORY_COLOUR_PRESETS,
  DEFAULT_CATEGORY_COLOUR,
} from "@/lib/categories/colours";
import type { LabelFormValues } from "@/lib/labels/types";
import { fieldClassName } from "@/lib/ui/field-classes";

type LabelFormFieldsProps = {
  values: LabelFormValues;
  onChange: (values: LabelFormValues) => void;
  idPrefix: string;
};

export function LabelFormFields({
  values,
  onChange,
  idPrefix,
}: LabelFormFieldsProps) {
  return (
    <div className="space-y-4">
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
          placeholder="Label name"
        />
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

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">Preview</p>
        <span
          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: values.colour }}
        >
          {values.name.trim() || "Label preview"}
        </span>
      </div>
    </div>
  );
}

export function createEmptyLabelFormValues(): LabelFormValues {
  return {
    name: "",
    colour: DEFAULT_CATEGORY_COLOUR,
  };
}
