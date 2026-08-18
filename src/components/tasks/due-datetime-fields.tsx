"use client";

import {
  DUE_TIME_OPTIONS,
  datetimeLocalHasExplicitTime,
  joinDatetimeLocalValue,
  normalizeLocalTimeString,
  splitDatetimeLocalValue,
} from "@/lib/tasks/due-datetime";
import {
  compactFieldClassName,
  formLabelClassName,
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { Clock, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  const parts = splitDatetimeLocalValue(value);
  const dateValue = parts?.date ?? "";
  const timeValue = parts?.time ?? "";
  const hasExplicitTime = datetimeLocalHasExplicitTime(value);
  const [timeOpen, setTimeOpen] = useState(hasExplicitTime);
  const canClear = Boolean(dateValue);

  useEffect(() => {
    if (hasExplicitTime) {
      setTimeOpen(true);
    }
  }, [hasExplicitTime]);

  useEffect(() => {
    if (!dateValue) {
      setTimeOpen(false);
    }
  }, [dateValue]);

  function emit(date: string, time: string | null) {
    if (!date) {
      onChange("");
      return;
    }

    onChange(joinDatetimeLocalValue(date, time ?? "00:00"));
  }

  function clearDue() {
    onChange("");
    setTimeOpen(false);
  }

  function handleDateChange(nextDate: string) {
    if (!nextDate) {
      clearDue();
      return;
    }

    emit(nextDate, timeOpen && hasExplicitTime ? timeValue : "00:00");
  }

  function handleTimeChange(nextTime: string) {
    if (!dateValue) {
      return;
    }

    if (!nextTime) {
      emit(dateValue, "00:00");
      return;
    }

    emit(dateValue, normalizeLocalTimeString(nextTime));
  }

  function toggleTime() {
    if (timeOpen) {
      if (dateValue) {
        emit(dateValue, "00:00");
      }
      setTimeOpen(false);
      return;
    }

    setTimeOpen(true);
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
          onChange={(event) => handleDateChange(event.target.value)}
          className={`${className} min-w-0 flex-1 basis-[9rem]`}
        />
        <button
          type="button"
          onClick={toggleTime}
          aria-label={timeOpen ? "Hide due time" : "Add due time"}
          aria-pressed={timeOpen}
          title={timeOpen ? "Hide time" : "Add time"}
          disabled={!dateValue && !timeOpen}
          className={`${toolbarIconButtonClassName} ${
            timeOpen || hasExplicitTime ? toolbarIconButtonActiveClassName : ""
          }`}
        >
          <Clock className="h-4 w-4" aria-hidden />
        </button>
        {canClear ? (
          <button
            type="button"
            onClick={clearDue}
            aria-label={`Clear ${label.toLowerCase()}`}
            title="Clear"
            className={toolbarIconButtonClassName}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {timeOpen && dateValue ? (
        <div className="mt-2 min-w-0">
          <label htmlFor={`${id}-time`} className={labelClassName}>
            Time
            <span className="font-normal text-stone-400 dark:text-stone-500">
              {" "}
              · optional
            </span>
          </label>
          <select
            id={`${id}-time`}
            value={hasExplicitTime ? timeValue : ""}
            onChange={(event) => handleTimeChange(event.target.value)}
            className={`${className} min-w-0`}
          >
            <option value="">No specific time</option>
            {DUE_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
