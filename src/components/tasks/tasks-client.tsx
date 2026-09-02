"use client";

import { TaskListItem } from "@/components/tasks/task-list-item";
import { AssigneeFilterChips } from "@/components/tasks/assignee-filter-chips";
import { WorkspaceFilterChips } from "@/components/tasks/workspace-filter-chips";
import {
  filterTasksByCategory,
  parseCategoryFilterParam,
  type TaskCategoryFilter,
} from "@/lib/categories/filter";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import {
  filterTasksByLabel,
  NO_LABEL_FILTER_VALUE,
  parseLabelFilterParam,
  type TaskLabelFilter,
} from "@/lib/labels/filter";
import { groupLabelsForPicker, resolveTaskLabelDisplay } from "@/lib/labels/display";
import type { Label } from "@/lib/labels/types";
import type { TaskCreatorProfile } from "@/lib/tasks/creators";
import { canDeleteSharedTask } from "@/lib/tasks/creators";
import {
  assigneeFilterToParam,
  collectAssigneeFilterPeople,
  filterTasksByAssignee,
  parseAssigneeFilterParam,
  type TaskAssigneeFilter,
} from "@/lib/tasks/assignee-filter";
import type { DueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { filterTasksBySearch } from "@/lib/tasks/search";
import {
  DEFAULT_TASK_SORT,
  parseSortParam,
  sortTasks,
  type TaskSortOption,
} from "@/lib/tasks/sort";
import {
  filterTasksByStatus,
  parseStatusFilterParam,
  type TaskStatusFilter,
} from "@/lib/tasks/status";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import {
  compactFieldClassName,
  fieldClassName,
  filterChipActiveClassName,
  filterChipClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type TasksClientTask = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  reminder_at: string | null;
  reminder_mode: string | null;
  reminder_offset_minutes: number | null;
  priority: string | null;
  recurrence: string | null;
  completed: boolean;
  cancelled_at: string | null;
  cancelled_by?: string | null;
  created_at: string;
  category_id: string | null;
  user_id: string;
  assigned_to: string | null;
};

type TasksClientProps = {
  tasks: TasksClientTask[];
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
  labelIdsByTaskId: Record<string, string[]>;
  subtasksByTaskId: Record<string, TaskSubtask[]>;
  historyByTaskId: Record<string, DueDateHistoryCounts>;
  creatorsByUserId: Record<string, TaskCreatorProfile>;
  currentUserId: string;
  isAdmin: boolean;
  editTaskId?: string | null;
  errors?: string[];
};

function syncUrl(
  pathname: string,
  next: {
    category: string | null;
    status: string | null;
    q: string | null;
    label: string | null;
    sort: string | null;
    assignee: string | null;
    edit: string | null;
  },
) {
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.sort) params.set("sort", next.sort);
  if (next.category) params.set("category", next.category);
  if (next.label) params.set("label", next.label);
  if (next.assignee) params.set("assignee", next.assignee);
  if (next.edit) params.set("edit", next.edit);
  const query = params.toString();
  const url = query ? `${pathname}?${query}` : pathname;
  window.history.replaceState(window.history.state, "", url);
}

export function TasksClient({
  tasks,
  categories,
  labels,
  categoryIdsByLabelId,
  labelIdsByTaskId,
  subtasksByTaskId,
  historyByTaskId,
  creatorsByUserId,
  currentUserId,
  isAdmin,
  editTaskId = null,
  errors = [],
}: TasksClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryLookup = useMemo(
    () => buildCategoryLookup(categories),
    [categories],
  );
  const { mains, subsByParent } = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );
  const labelLookup = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels],
  );
  const { global, personal } = useMemo(
    () => groupLabelsForPicker(labels),
    [labels],
  );

  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryFilter>(() =>
    parseCategoryFilterParam(
      searchParams.get("category") ?? undefined,
      categoryLookup,
    ),
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>(() =>
    parseStatusFilterParam(searchParams.get("status") ?? undefined),
  );
  const [assigneeFilter, setAssigneeFilter] = useState<TaskAssigneeFilter>(
    () =>
      parseAssigneeFilterParam(
        searchParams.get("assignee") ?? undefined,
        currentUserId,
      ),
  );
  const [labelFilter, setLabelFilter] = useState<TaskLabelFilter>(() =>
    parseLabelFilterParam(searchParams.get("label") ?? undefined, labelLookup),
  );
  const [sort, setSort] = useState<TaskSortOption>(() =>
    parseSortParam(searchParams.get("sort") ?? undefined),
  );
  const [searchDraft, setSearchDraft] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [searchQuery, setSearchQuery] = useState(
    () => (searchParams.get("q") ?? "").trim(),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchDraft.trim());
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [searchDraft]);

  const workspaceChipId =
    categoryFilter.type === "all" || categoryFilter.type === "uncategorized"
      ? "all"
      : categoryFilter.type === "main"
        ? categoryFilter.mainCategoryId
        : (categoryLookup.get(categoryFilter.subCategoryId)?.parent_id ??
          "all");

  const mainSelectValue =
    categoryFilter.type === "all"
      ? "all"
      : categoryFilter.type === "uncategorized"
        ? "uncategorized"
        : categoryFilter.type === "main"
          ? categoryFilter.mainCategoryId
          : (categoryLookup.get(categoryFilter.subCategoryId)?.parent_id ??
            "all");

  const subCategoryId =
    categoryFilter.type === "sub" ? categoryFilter.subCategoryId : null;
  const subcategories =
    mainSelectValue === "all" || mainSelectValue === "uncategorized"
      ? []
      : (subsByParent[mainSelectValue] ?? []);

  useEffect(() => {
    syncUrl(pathname, {
      category:
        categoryFilter.type === "all"
          ? null
          : categoryFilter.type === "uncategorized"
            ? "uncategorized"
            : categoryFilter.type === "main"
              ? categoryFilter.mainCategoryId
              : categoryFilter.subCategoryId,
      status: statusFilter === "open" ? null : statusFilter,
      q: searchQuery || null,
      label:
        labelFilter.type === "all"
          ? null
          : labelFilter.type === "none"
            ? NO_LABEL_FILTER_VALUE
            : labelFilter.labelId,
      sort: sort === DEFAULT_TASK_SORT ? null : sort,
      assignee: assigneeFilterToParam(assigneeFilter),
      edit: editTaskId,
    });
  }, [
    pathname,
    categoryFilter,
    statusFilter,
    searchQuery,
    labelFilter,
    sort,
    assigneeFilter,
    editTaskId,
  ]);

  const filteredTasks = useMemo(() => {
    const byCategory = filterTasksByCategory(
      tasks,
      categoryFilter,
      subsByParent,
    );
    const byLabel = filterTasksByLabel(
      byCategory,
      labelFilter,
      labelIdsByTaskId,
    );
    const byStatus = filterTasksByStatus(byLabel, statusFilter);
    const byAssignee = filterTasksByAssignee(
      byStatus,
      assigneeFilter,
      currentUserId,
    );
    const bySearch = filterTasksBySearch(byAssignee, searchQuery);
    return sortTasks(bySearch, sort);
  }, [
    tasks,
    categoryFilter,
    subsByParent,
    labelFilter,
    labelIdsByTaskId,
    statusFilter,
    assigneeFilter,
    currentUserId,
    searchQuery,
    sort,
  ]);

  const assigneePeople = useMemo(
    () => collectAssigneeFilterPeople(tasks, creatorsByUserId, currentUserId),
    [tasks, creatorsByUserId, currentUserId],
  );

  const tasksToRender =
    editTaskId && !filteredTasks.some((task) => task.id === editTaskId)
      ? [
          ...tasks.filter((task) => task.id === editTaskId),
          ...filteredTasks,
        ]
      : filteredTasks;

  function handleWorkspaceSelect(id: string) {
    if (id === "all") {
      setCategoryFilter({ type: "all" });
      return;
    }
    setCategoryFilter({ type: "main", mainCategoryId: id });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col space-y-3 overflow-x-hidden">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {tasksToRender.length} task{tasksToRender.length === 1 ? "" : "s"}
      </p>

      {categories.length > 0 ? (
        <WorkspaceFilterChips
          categories={categories}
          activeId={workspaceChipId}
          onSelect={handleWorkspaceSelect}
        />
      ) : null}

      <AssigneeFilterChips
        active={assigneeFilter}
        currentUserId={currentUserId}
        people={assigneePeople}
        onSelect={setAssigneeFilter}
      />

      <div
        className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Status filter"
      >
        {(
          [
            { id: "open", label: "Open" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
            { id: "all", label: "All" },
          ] as const
        ).map((option) => {
          const selected = statusFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setStatusFilter(option.id)}
              className={`${filterChipClassName} ${
                selected ? filterChipActiveClassName : filterChipIdleClassName
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          Filters
          {advancedOpen ? (
            <ChevronUp className="h-4 w-4 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
          )}
        </button>
        {categoryFilter.type !== "all" ||
        statusFilter !== "open" ||
        searchQuery ||
        labelFilter.type !== "all" ||
        sort !== DEFAULT_TASK_SORT ||
        assigneeFilter.type !== "all" ? (
          <button
            type="button"
            onClick={() => {
              setCategoryFilter({ type: "all" });
              setStatusFilter("open");
              setLabelFilter({ type: "all" });
              setAssigneeFilter({ type: "all" });
              setSort(DEFAULT_TASK_SORT);
              setSearchDraft("");
              setSearchQuery("");
            }}
            className="min-h-10 shrink-0 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-800 dark:hover:text-stone-200"
          >
            Clear
          </button>
        ) : null}
      </div>

      {advancedOpen ? (
        <div className="min-w-0 space-y-2.5 rounded-xl border border-stone-200/80 bg-white p-3 dark:border-stone-700/80 dark:bg-stone-900">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <label htmlFor="task-filter-search" className="sr-only">
              Search
            </label>
            <input
              id="task-filter-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search tasks"
              className={`${compactFieldClassName} min-h-11 pl-9`}
            />
          </div>
          <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="task-filter-sort"
                className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
              >
                Sort
              </label>
              <select
                id="task-filter-sort"
                value={sort}
                onChange={(event) =>
                  setSort(parseSortParam(event.target.value))
                }
                className={`${fieldClassName} min-h-11`}
              >
                <option value="due_asc">Due date soonest</option>
                <option value="created_desc">Created newest</option>
                <option value="created_asc">Created oldest</option>
                <option value="title_asc">Title A–Z</option>
                <option value="priority_desc">Priority</option>
              </select>
            </div>
            {labels.length > 0 ? (
              <div className="min-w-0">
                <label
                  htmlFor="task-filter-label"
                  className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
                >
                  Label
                </label>
                <select
                  id="task-filter-label"
                  value={
                    labelFilter.type === "all"
                      ? "all"
                      : labelFilter.type === "none"
                        ? NO_LABEL_FILTER_VALUE
                        : labelFilter.labelId
                  }
                  onChange={(event) =>
                    setLabelFilter(
                      parseLabelFilterParam(event.target.value, labelLookup),
                    )
                  }
                  className={`${fieldClassName} min-h-11`}
                >
                  <option value="all">All labels</option>
                  <option value={NO_LABEL_FILTER_VALUE}>No labels</option>
                  {global.length > 0 ? (
                    <optgroup label="Shared labels">
                      {global.map((label) => (
                        <option key={label.id} value={label.id}>
                          {label.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {personal.length > 0 ? (
                    <optgroup label="My labels">
                      {personal.map((label) => (
                        <option key={label.id} value={label.id}>
                          {label.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </div>
            ) : null}
            {subcategories.length > 0 ? (
              <div className="min-w-0">
                <label
                  htmlFor="task-filter-sub"
                  className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400"
                >
                  Subcategory
                </label>
                <select
                  id="task-filter-sub"
                  value={subCategoryId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      if (
                        mainSelectValue !== "all" &&
                        mainSelectValue !== "uncategorized"
                      ) {
                        setCategoryFilter({
                          type: "main",
                          mainCategoryId: mainSelectValue,
                        });
                      }
                      return;
                    }
                    setCategoryFilter({ type: "sub", subCategoryId: value });
                  }}
                  className={`${fieldClassName} min-h-11`}
                >
                  <option value="">
                    All in{" "}
                    {mains.find((main) => main.id === mainSelectValue)?.name ??
                      "category"}
                  </option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {errors.map((message) => (
        <div
          key={message}
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm break-words text-amber-800"
        >
          {message}
        </div>
      ))}

      {tasks.length > 0 && tasksToRender.length > 0 ? (
        <ul className="min-w-0 overflow-hidden rounded-xl border border-stone-200/80 bg-white px-2 dark:border-stone-700/80 dark:bg-stone-900">
          {tasksToRender.map((task) => {
            const category = getCategoryDisplay(
              task.category_id,
              categoryLookup,
            );
            const categoryUnavailable =
              task.category_id !== null && category === null;
            const taskLabelIds = labelIdsByTaskId[task.id] ?? [];
            const taskLabelDisplay = resolveTaskLabelDisplay(
              taskLabelIds,
              labelLookup,
            );

            return (
              <TaskListItem
                key={task.id}
                id={task.id}
                title={task.title}
                description={task.description}
                dueAt={task.due_at}
                reminderAt={task.reminder_at}
                reminderMode={task.reminder_mode}
                reminderOffsetMinutes={task.reminder_offset_minutes}
                priority={task.priority}
                recurrence={task.recurrence}
                completed={task.completed}
                cancelledAt={task.cancelled_at}
                createdAt={task.created_at}
                categoryId={task.category_id}
                category={category}
                categoryUnavailable={categoryUnavailable}
                categories={categories}
                labels={labels}
                categoryIdsByLabelId={categoryIdsByLabelId}
                labelIds={taskLabelIds}
                taskLabels={taskLabelDisplay}
                dueDateHistory={
                  historyByTaskId[task.id] ?? {
                    dueDateUpdateCount: 0,
                    movedLaterCount: 0,
                    movedEarlierCount: 0,
                  }
                }
                subtasks={subtasksByTaskId[task.id] ?? []}
                initialEditing={editTaskId === task.id}
                taskUserId={task.user_id}
                currentUserId={currentUserId}
                creator={
                  task.user_id !== currentUserId
                    ? (creatorsByUserId[task.user_id] ?? null)
                    : null
                }
                assignedTo={task.assigned_to}
                assignee={
                  task.assigned_to
                    ? (creatorsByUserId[task.assigned_to] ?? null)
                    : null
                }
                canDelete={canDeleteSharedTask({
                  currentUserId,
                  isAdmin,
                  taskUserId: task.user_id,
                  categoryId: task.category_id,
                  categoryScope:
                    categoryLookup.get(task.category_id ?? "")?.scope ?? null,
                })}
              />
            );
          })}
        </ul>
      ) : tasks.length > 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center dark:border-stone-600 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            No matching tasks
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-500 dark:text-stone-400">
            Try adjusting or clearing your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center dark:border-stone-600 dark:bg-stone-900">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            No tasks yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-500 dark:text-stone-400">
            Tap New task to create your first one.
          </p>
        </div>
      )}
    </div>
  );
}
