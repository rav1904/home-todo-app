"use client";

import {
  DEFAULT_TASK_PRIORITY,
  getPriorityBadgeClassName,
  getPriorityLabel,
  parseTaskPriority,
  TASK_PRIORITY_OPTIONS,
  type TaskPriority,
} from "@/lib/tasks/priority";
import {
  compactFieldClassName,
  formLabelClassName,
} from "@/lib/ui/field-classes";

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
  labelClassName = formLabelClassName,
  className = compactFieldClassName,
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
  /** Hide the default (medium) priority on cards — only signal non-default. */
  hideDefault?: boolean;
  className?: string;
};

export function PriorityBadge({
  priority,
  hideDefault = false,
  className = "",
}: PriorityBadgeProps) {
  const safe = parseTaskPriority(priority);

  if (hideDefault && safe === DEFAULT_TASK_PRIORITY) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPriorityBadgeClassName(safe)} ${className}`}
    >
      {getPriorityLabel(safe)}
    </span>
  );
}

export { DEFAULT_TASK_PRIORITY };
