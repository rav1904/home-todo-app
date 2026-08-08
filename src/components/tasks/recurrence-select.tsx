"use client";

import {
  DEFAULT_TASK_RECURRENCE,
  parseTaskRecurrence,
  RECURRENCE_NEXT_OCCURRENCE_HINT,
  TASK_RECURRENCE_OPTIONS,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import { fieldClassName } from "@/lib/ui/field-classes";

type RecurrenceSelectProps = {
  id: string;
  value: TaskRecurrence;
  onChange: (value: TaskRecurrence) => void;
  dueLocal: string;
  labelClassName?: string;
  className?: string;
};

export function RecurrenceSelect({
  id,
  value,
  onChange,
  dueLocal,
  labelClassName = "mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300",
  className = fieldClassName,
}: RecurrenceSelectProps) {
  const hasDueDate = Boolean(dueLocal);

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        Repeat
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(parseTaskRecurrence(event.target.value))}
        className={className}
      >
        {TASK_RECURRENCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value !== DEFAULT_TASK_RECURRENCE && !hasDueDate ? (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
          Select a due date to use a repeating schedule.
        </p>
      ) : null}
      {value !== DEFAULT_TASK_RECURRENCE && hasDueDate ? (
        <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
          {RECURRENCE_NEXT_OCCURRENCE_HINT}
        </p>
      ) : null}
    </div>
  );
}
