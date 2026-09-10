"use client";

import {
  joinDatetimeLocalValue,
  splitDatetimeLocalValue,
} from "@/lib/tasks/due-datetime";
import {
  compactFieldClassName,
  formLabelClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { X } from "lucide-react";

type DueDatetimeFieldsProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  optional?: boolean;
  labelClassName?: string;
  className?: string;
};

export function DueDatetimeFields({
  id,
  value,
  onChange,
  label = "Due date",
  optional = true,
  labelClassName = formLabelClassName,
  className = compactFieldClassName,
}: DueDatetimeFieldsProps) {
  const dateValue = splitDatetimeLocalValue(value)?.date ?? "";
  const canClear = Boolean(dateValue);

  function emit(date: string) {
    if (!date) {
      onChange("");
      return;
    }

    onChange(joinDatetimeLocalValue(date, "00:00"));
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClassName}>
        {label}
        {optional ? (
          <span className="font-normal text-stone-400 dark:text-stone-500">
            {" "}
            · optional
          </span>
        ) : null}
      </label>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          id={id}
          type="date"
          value={dateValue}
          onChange={(event) => emit(event.target.value)}
          aria-label={`Select ${label.toLowerCase()}`}
          className={`${className} min-h-11 min-w-0 flex-1 basis-[9rem]`}
        />
        {canClear ? (
          <button
            type="button"
            onClick={() => emit("")}
            aria-label={`Clear ${label.toLowerCase()}`}
            title="Clear"
            className={toolbarIconButtonClassName}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
