"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

export type FocusTowerSection = {
  id: string;
  title: string;
  count: number;
  tone?: "default" | "danger" | "warning";
  tasks: ReactNode;
};

type FocusTowerAccordionsProps = {
  towerId: string;
  sections: FocusTowerSection[];
};

const countClass: Record<NonNullable<FocusTowerSection["tone"]>, string> = {
  default: "text-stone-500 dark:text-stone-400",
  danger: "text-rose-700 dark:text-rose-300",
  warning: "text-amber-800 dark:text-amber-300",
};

export function FocusTowerAccordions({
  towerId,
  sections,
}: FocusTowerAccordionsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-white dark:bg-stone-950/60">
      {sections.map((section) => {
        const open = openId === section.id;
        const tone = section.tone ?? "default";

        return (
          <div
            key={section.id}
            className="border-b border-stone-100 last:border-b-0 dark:border-stone-800"
          >
            <button
              type="button"
              onClick={() => toggle(section.id)}
              aria-expanded={open}
              aria-controls={`${towerId}-${section.id}`}
              className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 px-2.5 py-1.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {open ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                )}
                <span className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-100">
                  {section.title}
                </span>
              </span>
              <span
                className={`shrink-0 text-[13px] font-semibold tabular-nums ${countClass[tone]}`}
              >
                {section.count}
              </span>
            </button>
            {open ? (
              <div id={`${towerId}-${section.id}`} className="px-2 pb-2">
                {section.count === 0 ? (
                  <p className="px-0.5 py-1.5 text-xs text-stone-400 dark:text-stone-500">
                    Nothing here.
                  </p>
                ) : (
                  <div className="space-y-1.5">{section.tasks}</div>
                )}
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="mt-1.5 inline-flex min-h-8 cursor-pointer items-center text-[11px] font-medium text-stone-400 transition hover:text-stone-700 dark:hover:text-stone-200"
                >
                  Close section
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
