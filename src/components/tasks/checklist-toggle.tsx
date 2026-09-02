"use client";

import {
  toolbarIconButtonActiveClassName,
  toolbarIconButtonClassName,
} from "@/lib/ui/field-classes";
import { ListChecks } from "lucide-react";
import type { ReactNode } from "react";

type ChecklistToolbarButtonProps = {
  open: boolean;
  populated?: boolean;
  /** e.g. "2/5" when subtasks exist */
  countLabel?: string | null;
  onClick: () => void;
};

/** Compact toolbar icon matching Priority / Reminder / Labels controls. */
export function ChecklistToolbarButton({
  open,
  populated = false,
  countLabel = null,
  onClick,
}: ChecklistToolbarButtonProps) {
  const hasItems = Boolean(countLabel) || populated;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        countLabel ? `Checklist ${countLabel}` : "Checklist"
      }
      aria-pressed={open}
      title={countLabel ? `Checklist ${countLabel}` : "Checklist"}
      className={`relative ${toolbarIconButtonClassName} ${
        open || hasItems ? toolbarIconButtonActiveClassName : ""
      }`}
    >
      <ListChecks className="h-4 w-4" aria-hidden />
      {countLabel ? (
        <span className="absolute -top-0.5 -right-0.5 max-w-[2.25rem] truncate rounded-full bg-emerald-600 px-1 py-px text-[9px] leading-none font-semibold text-white tabular-nums dark:bg-emerald-500">
          {countLabel}
        </span>
      ) : hasItems ? (
        <span
          className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

export function ChecklistPanel({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return <div className="min-w-0">{children}</div>;
}
