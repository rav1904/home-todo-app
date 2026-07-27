"use client";

import {
  CATEGORY_COLOUR_PRESETS,
  DEFAULT_CATEGORY_COLOUR,
} from "@/lib/categories/colours";
import type { LabelFormValues } from "@/lib/labels/types";

const fieldClassName =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

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
          className="mb-1.5 block text-sm font-medium text-stone-700"
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
        <p className="mb-2 text-sm font-medium text-stone-700">Colour</p>
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
                  isSelected ? "border-stone-900" : "border-transparent"
                }`}
                style={{ backgroundColor: preset.value }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">Preview</p>
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
