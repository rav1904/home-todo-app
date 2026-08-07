"use client";

import { AddTaskForm } from "@/components/tasks/add-task-form";
import type { Category } from "@/lib/categories/types";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function QuickAddTaskLauncher() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadFormData = useCallback(async () => {
    if (loaded) {
      return;
    }

    setLoading(true);
    setFetchError(null);

    const supabase = createClient();
    const [
      { data: categoryRows, error: categoriesError },
      { data: labelRows, error: labelsError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select(
          "id, parent_id, name, colour, icon_name, sort_order, active, created_at, updated_at",
        )
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("labels")
        .select(LABEL_SELECT_FIELDS)
        .eq("active", true)
        .order("scope", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    if (categoriesError || labelsError) {
      setFetchError(
        categoriesError?.message ??
          labelsError?.message ??
          "Could not load form data.",
      );
      setLoading(false);
      return;
    }

    setCategories((categoryRows ?? []) as Category[]);
    setLabels((labelRows ?? []) as Label[]);
    setLoaded(true);
    setLoading(false);
  }, [loaded]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadFormData();
  }, [open, loadFormData]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add task"
        className="fixed left-[calc(16rem+1.5rem)] z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-stone-50 dark:shadow-emerald-900/40 dark:focus:ring-offset-stone-950"
        style={{
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-task-title"
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="quick-add-task-title"
                className="text-lg font-semibold text-stone-900 dark:text-stone-100"
              >
                New task
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Loading form...
              </p>
            ) : fetchError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {fetchError}
              </p>
            ) : (
              <AddTaskForm
                categories={categories}
                labels={labels}
                showHeading={false}
                embedded
                onSuccess={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
