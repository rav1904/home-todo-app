"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type TaskFormMoreDetailsProps = {
  open: boolean;
  onToggle: () => void;
  summary?: string;
  children: ReactNode;
};

export function TaskFormMoreDetails({
  open,
  onToggle,
  summary,
  children,
}: TaskFormMoreDetailsProps) {
  return (
    <div className="rounded-lg border border-stone-200/80 dark:border-stone-700/80">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/60"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          )}
          <span>More details</span>
          {!open && summary ? (
            <span className="truncate font-normal text-stone-400 dark:text-stone-500">
              · {summary}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs font-normal text-stone-400 dark:text-stone-500">
          Category & labels
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-stone-200/80 px-3 py-3 dark:border-stone-700/80">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type TaskFormNotesToggleProps = {
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
};

/** Shows a quiet “Add notes” control until notes are opened or already present. */
export function TaskFormNotesToggle({
  open,
  onOpen,
  children,
}: TaskFormNotesToggleProps) {
  if (open) {
    return <>{children}</>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="cursor-pointer text-left text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
    >
      Add notes
    </button>
  );
}
