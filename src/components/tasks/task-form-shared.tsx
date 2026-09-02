"use client";

import {
  compactFieldClassName,
  formLabelClassName,
  titleFieldClassName,
} from "@/lib/ui/field-classes";
import {
  TASK_TITLE_LENGTH_HINT,
  TASK_TITLE_LIMIT_REACHED,
  TASK_TITLE_MAX_LENGTH,
  TASK_TITLE_WARNING_LENGTH,
  constrainTaskTitleInput,
} from "@/lib/tasks/title";
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
          Labels
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

type TaskTitleFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
  /** Visually hide the "Title" label (sr-only). */
  hideLabel?: boolean;
};

export function TaskTitleField({
  id,
  value,
  onChange,
  placeholder = "What needs doing?",
  autoFocus = false,
  inputClassName = `${titleFieldClassName} min-h-11`,
  hideLabel = true,
}: TaskTitleFieldProps) {
  const length = value.length;
  const overLimit = length > TASK_TITLE_MAX_LENGTH;
  const atLimit = length >= TASK_TITLE_MAX_LENGTH;
  const showWarning = length >= TASK_TITLE_WARNING_LENGTH;
  const showCounter = length > 0;
  const enforceMaxLength = length <= TASK_TITLE_MAX_LENGTH;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : formLabelClassName}
      >
        Title
      </label>
      <input
        id={id}
        type="text"
        required
        autoFocus={autoFocus}
        value={value}
        maxLength={enforceMaxLength ? TASK_TITLE_MAX_LENGTH : undefined}
        onChange={(event) =>
          onChange(constrainTaskTitleInput(event.target.value, value))
        }
        className={`${inputClassName} min-w-0 max-w-full`}
        placeholder={placeholder}
        aria-describedby={`${id}-meta`}
      />
      <div
        id={`${id}-meta`}
        className="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-0.5"
      >
        {showWarning ? (
          <p
            className={`min-w-0 flex-1 text-xs leading-snug break-words ${
              overLimit || atLimit
                ? "font-medium text-rose-600 dark:text-rose-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {atLimit || overLimit
              ? TASK_TITLE_LIMIT_REACHED
              : TASK_TITLE_LENGTH_HINT}
          </p>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        {showCounter ? (
          <p
            className={`shrink-0 text-xs tabular-nums ${
              overLimit || atLimit
                ? "font-medium text-rose-600 dark:text-rose-400"
                : showWarning
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-stone-400 dark:text-stone-500"
            }`}
            aria-live="polite"
          >
            {length}/{TASK_TITLE_MAX_LENGTH}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type TaskNotesFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function TaskNotesField({
  id,
  value,
  onChange,
  rows = 2,
}: TaskNotesFieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={formLabelClassName}>
        Notes
        <span className="font-normal text-stone-400 dark:text-stone-500">
          {" "}
          · optional
        </span>
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${compactFieldClassName} max-w-full resize-y break-words`}
        placeholder="Add notes or details…"
      />
    </div>
  );
}
