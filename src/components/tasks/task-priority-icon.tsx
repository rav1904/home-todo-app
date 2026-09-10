"use client";

import {
  getPriorityAriaLabel,
  parseTaskPriority,
  type TaskPriority,
} from "@/lib/tasks/priority";
import { ArrowDown, ArrowUp, Flame, Minus } from "lucide-react";

const ICON_CLASS = "h-3.5 w-3.5 shrink-0";

function PriorityGlyph({
  priority,
}: {
  priority: TaskPriority;
}) {
  switch (priority) {
    case "low":
      return <ArrowDown className={`${ICON_CLASS} text-stone-400`} aria-hidden />;
    case "medium":
      return <Minus className={`${ICON_CLASS} text-stone-400`} aria-hidden />;
    case "high":
      return (
        <ArrowUp className={`${ICON_CLASS} text-amber-600 dark:text-amber-400`} aria-hidden />
      );
    case "urgent":
      return (
        <Flame className={`${ICON_CLASS} text-rose-600 dark:text-rose-400`} aria-hidden />
      );
  }
}

type TaskPriorityIconProps = {
  priority?: string | null;
  className?: string;
};

export function TaskPriorityIcon({
  priority,
  className = "",
}: TaskPriorityIconProps) {
  const safe = parseTaskPriority(priority);
  const label = getPriorityAriaLabel(safe);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      title={label}
      aria-label={label}
    >
      <PriorityGlyph priority={safe} />
    </span>
  );
}
