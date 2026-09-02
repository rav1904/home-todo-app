"use client";

import { AddTaskForm } from "@/components/tasks/add-task-form";
import {
  CATEGORY_SELECT_FIELDS,
  ensureMyPersonalCategory,
  getPersonalCategoryId,
} from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function readCalendarDayDefaultDue(
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  if (!pathname.startsWith("/dashboard/calendar")) {
    return null;
  }

  if (searchParams.get("view") !== "day") {
    return null;
  }

  const date = searchParams.get("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return null;
}

export function QuickAddTaskLauncher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultDueAt = useMemo(
    () => readCalendarDayDefaultDue(pathname, searchParams),
    [pathname, searchParams],
  );

  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personalCategoryId, setPersonalCategoryId] = useState<string | null>(
    null,
  );
  const [labels, setLabels] = useState<Label[]>([]);
  const [categoryIdsByLabelId, setCategoryIdsByLabelId] = useState<
    Record<string, string[]>
  >({});
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
    const ensureResult = await ensureMyPersonalCategory(supabase);
    if (ensureResult.error) {
      setFetchError(ensureResult.error.message);
      setLoading(false);
      return;
    }

    const [
      { data: categoryRows, error: categoriesError },
      { data: labelRows, error: labelsError },
      { data: linkRows, error: linksError },
    ] = await Promise.all([
      supabase
        .from("categories")
        .select(CATEGORY_SELECT_FIELDS)
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
      supabase.from("label_categories").select(LABEL_CATEGORY_LINK_FIELDS),
    ]);

    if (categoriesError || labelsError || linksError) {
      setFetchError(
        categoriesError?.message ??
          labelsError?.message ??
          linksError?.message ??
          "Could not load form data.",
      );
      setLoading(false);
      return;
    }

    const nextCategories = (categoryRows ?? []) as Category[];
    setCategories(nextCategories);
    setPersonalCategoryId(
      ensureResult.id ?? getPersonalCategoryId(nextCategories),
    );
    setLabels((labelRows ?? []) as Label[]);
    setCategoryIdsByLabelId(
      groupCategoryIdsByLabel((linkRows ?? []) as LabelCategoryLink[]),
    );
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
        aria-label="Add task"
        title="Add task"
        className="fixed z-40 flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:shadow-emerald-900/40 dark:focus-visible:ring-offset-stone-950"
        style={{
          right: "max(1.25rem, env(safe-area-inset-right))",
          bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-task-title"
            className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-4 shadow-xl sm:rounded-2xl dark:border-stone-700 dark:bg-stone-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="quick-add-task-title"
                className="text-base font-semibold text-stone-900 dark:text-stone-100"
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
                key={defaultDueAt ?? "no-default-due"}
                categories={categories}
                labels={labels}
                categoryIdsByLabelId={categoryIdsByLabelId}
                defaultCategoryId={personalCategoryId}
                defaultDueAt={defaultDueAt}
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
