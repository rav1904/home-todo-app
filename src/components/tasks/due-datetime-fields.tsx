"use client";

import { normalizeDatetimeLocalValue } from "@/lib/tasks/due-datetime";
import { fieldClassName } from "@/lib/ui/field-classes";

type DueDatetimeFieldsProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelClassName?: string;
};

export function DueDatetimeFields({
  id,
  value,
  onChange,
  label = "Due date",
  labelClassName = "mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300",
}: DueDatetimeFieldsProps) {
  const inputValue = value ? normalizeDatetimeLocalValue(value) : "";

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}{" "}
        <span className="font-normal text-stone-400 dark:text-stone-500">
          (optional)
        </span>
      </label>
      <input
        id={id}
        type="datetime-local"
        step={300}
        value={inputValue}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next ? normalizeDatetimeLocalValue(next) : "");
        }}
        onBlur={(event) => {
          const next = event.target.value;
          if (!next) {
            return;
          }

          const normalized = normalizeDatetimeLocalValue(next);
          if (normalized !== next) {
            onChange(normalized);
          }
        }}
        className={fieldClassName}
      />
    </div>
  );
}
