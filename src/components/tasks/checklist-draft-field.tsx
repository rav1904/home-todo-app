"use client";

import {
  compactFieldClassName,
  formPrimaryButtonClassName,
} from "@/lib/ui/field-classes";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type ChecklistDraftPanelProps = {
  id?: string;
  items: string[];
  onChange: (items: string[]) => void;
};

/** Expanded draft checklist body for Add Task (no toggle chrome). */
export function ChecklistDraftPanel({
  id = "task-checklist-draft",
  items,
  onChange,
}: ChecklistDraftPanelProps) {
  const [draft, setDraft] = useState("");

  function addItem() {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    onChange([...items, trimmed]);
    setDraft("");
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="min-w-0 rounded-lg border border-stone-200/80 p-2.5 dark:border-stone-700/80">
      <p className="mb-2 text-xs text-stone-400 dark:text-stone-500">
        Break the task into steps
      </p>

      {items.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex min-w-0 items-start gap-2 rounded-lg bg-stone-50 px-2 py-1.5 dark:bg-stone-800/60"
            >
              <span
                className="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-300 dark:border-stone-600"
                aria-hidden
              />
              <span className="min-w-0 flex-1 text-sm leading-snug break-words [overflow-wrap:anywhere] text-stone-800 dark:text-stone-100">
                {item}
              </span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remove checklist item "${item}"`}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          New checklist item
        </label>
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a subtask…"
          className={`${compactFieldClassName} min-h-11 min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={addItem}
          className={`${formPrimaryButtonClassName} min-h-11 shrink-0`}
        >
          Add item
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use ChecklistDraftPanel with parent toolbar toggle. */
export const ChecklistDraftField = ChecklistDraftPanel;
