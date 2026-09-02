"use client";

import {
  CATEGORY_SELECT_FIELDS,
} from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import {
  globalSearchHasResults,
  runGlobalSearch,
  type GlobalSearchSnapshot,
  type GlobalSearchTask,
} from "@/lib/search/global-search";
import { loadTaskCreatorProfiles } from "@/lib/tasks/creators";
import { createClient } from "@/lib/supabase/client";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type GlobalSearchProps = {
  open: boolean;
  onClose: () => void;
};

export function GlobalSearchButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      title="Search"
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GlobalSearchSnapshot | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const [
      { data: tasks, error: tasksError },
      { data: categories, error: categoriesError },
      { data: labels, error: labelsError },
      { data: taskLabels, error: taskLabelsError },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, description, due_at, reminder_at, priority, recurrence, completed, cancelled_at, category_id, created_at, assigned_to",
        )
        .order("created_at", { ascending: false }),
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
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("task_labels").select("task_id, label_id"),
    ]);

    if (tasksError || categoriesError || labelsError || taskLabelsError) {
      setError(
        tasksError?.message ??
          categoriesError?.message ??
          labelsError?.message ??
          taskLabelsError?.message ??
          "Could not load search data.",
      );
      setSnapshot(null);
      setLoading(false);
      return;
    }

    const labelIdsByTaskId: Record<string, string[]> = {};
    for (const row of taskLabels ?? []) {
      const taskId = row.task_id as string;
      const labelId = row.label_id as string;
      if (!labelIdsByTaskId[taskId]) {
        labelIdsByTaskId[taskId] = [];
      }
      labelIdsByTaskId[taskId].push(labelId);
    }

    const assigneeIds = [
      ...new Set(
        (tasks ?? [])
          .map((task) => (task as GlobalSearchTask).assigned_to)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const assigneeProfiles = await loadTaskCreatorProfiles(
      supabase,
      assigneeIds,
    );
    const assigneeNamesByUserId: Record<string, string> = {};
    for (const [id, profile] of Object.entries(assigneeProfiles)) {
      assigneeNamesByUserId[id] = profile.displayName;
    }

    setSnapshot({
      tasks: (tasks ?? []) as GlobalSearchTask[],
      categories: (categories ?? []) as Category[],
      labels: (labels ?? []) as Label[],
      labelIdsByTaskId,
      assigneeNamesByUserId,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setDebouncedQuery("");
    void loadSnapshot();

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, loadSnapshot]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const results = snapshot
    ? runGlobalSearch(debouncedQuery, snapshot)
    : {
        quickFilters: [],
        tasks: [],
        categories: [],
        labels: [],
      };
  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = globalSearchHasResults(results);

  function navigate(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-950/40 p-3 pt-[max(1rem,8vh)] sm:p-6 sm:pt-[12vh] dark:bg-black/55"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(80vh,640px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-stone-200/80 px-3 py-2.5 dark:border-stone-700/80">
          <Search
            className="ml-1 h-4 w-4 shrink-0 text-stone-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={titleId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, categories, labels…"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100 dark:placeholder:text-stone-500"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
              Loading…
            </p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          ) : !hasQuery ? (
            <div className="space-y-2 px-2 py-4 text-sm text-stone-500 dark:text-stone-400">
              <p>Try searching for a task, category, or label.</p>
              <p className="text-xs">
                Examples: overdue · today · priority:urgent · status:open ·
                category:Car · label:Insurance
              </p>
            </div>
          ) : !hasResults ? (
            <p className="px-2 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
              No results for “{debouncedQuery.trim()}”.
            </p>
          ) : (
            <div className="space-y-4">
              {results.quickFilters.length > 0 ? (
                <ResultGroup title="Quick filters">
                  {results.quickFilters.map((item) => (
                    <ResultButton
                      key={item.id}
                      label={item.label}
                      onSelect={() => navigate(item.href)}
                    />
                  ))}
                </ResultGroup>
              ) : null}

              {results.tasks.length > 0 ? (
                <ResultGroup title="Tasks">
                  {results.tasks.map((item) => (
                    <ResultButton
                      key={item.id}
                      label={item.title}
                      meta={item.meta}
                      onSelect={() => navigate(item.href)}
                    />
                  ))}
                </ResultGroup>
              ) : null}

              {results.categories.length > 0 ? (
                <ResultGroup title="Categories">
                  {results.categories.map((item) => (
                    <ResultButton
                      key={item.id}
                      label={item.label}
                      onSelect={() => navigate(item.href)}
                    />
                  ))}
                </ResultGroup>
              ) : null}

              {results.labels.length > 0 ? (
                <ResultGroup title="Labels">
                  {results.labels.map((item) => (
                    <ResultButton
                      key={item.id}
                      label={item.label}
                      onSelect={() => navigate(item.href)}
                    />
                  ))}
                </ResultGroup>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function ResultButton({
  label,
  meta,
  onSelect,
}: {
  label: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full cursor-pointer flex-col rounded-xl px-2.5 py-2 text-left transition hover:bg-stone-100 dark:hover:bg-stone-800"
      >
        <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
          {label}
        </span>
        {meta ? (
          <span className="truncate text-xs text-stone-500 dark:text-stone-400">
            {meta}
          </span>
        ) : null}
      </button>
    </li>
  );
}
