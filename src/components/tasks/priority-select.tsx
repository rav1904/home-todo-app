"use client";

import {
  DEFAULT_TASK_PRIORITY,
  getPriorityBadgeClassName,
  getPriorityLabel,
  parseTaskPriority,
  TASK_PRIORITY_OPTIONS,
  type TaskPriority,
} from "@/lib/tasks/priority";
import { fieldClassName } from "@/lib/ui/field-classes";

type PrioritySelectProps = {
  id: string;
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  labelClassName?: string;
  className?: string;
};

export function PrioritySelect({
  id,
  value,
  onChange,
  labelClassName = "mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300",
  className = fieldClassName,
}: PrioritySelectProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        Priority
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(parseTaskPriority(event.target.value))}
        className={className}
      >
        {TASK_PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type PriorityBadgeProps = {
  priority: TaskPriority;
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const safe = parseTaskPriority(priority);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityBadgeClassName(safe)}`}
    >
      {getPriorityLabel(safe)}
    </span>
  );
}

export { DEFAULT_TASK_PRIORITY };
