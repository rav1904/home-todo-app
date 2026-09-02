import type { Category } from "@/lib/categories/types";
import { getCategoryDisplay } from "@/lib/categories/tree";
import type { Label } from "@/lib/labels/types";
import { isTaskCancelled, isTaskOpen } from "@/lib/tasks/cancel";
import {
  isFocusDueOverdue,
  isFocusDueToday,
} from "@/lib/tasks/focus";
import {
  DEFAULT_TASK_SORT,
  type TaskSortOption,
} from "@/lib/tasks/sort";
import {
  buildTasksFilterUrl,
  type TasksListQueryState,
} from "@/lib/tasks/filter";
import {
  isTaskPriority,
  parseTaskPriority,
  type TaskPriority,
} from "@/lib/tasks/priority";
import {
  parseTaskRecurrence,
  type TaskRecurrence,
} from "@/lib/tasks/recurrence";
import type { TaskStatusFilter } from "@/lib/tasks/status";

export const GLOBAL_SEARCH_TASK_LIMIT = 10;
export const GLOBAL_SEARCH_CATEGORY_LIMIT = 6;
export const GLOBAL_SEARCH_LABEL_LIMIT = 6;

export type GlobalSearchTask = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  reminder_at: string | null;
  priority: string;
  recurrence: string;
  completed: boolean;
  cancelled_at?: string | null;
  category_id: string | null;
  created_at: string;
};

export type GlobalSearchSnapshot = {
  tasks: GlobalSearchTask[];
  categories: Category[];
  labels: Label[];
  labelIdsByTaskId: Record<string, string[]>;
};

export type ParsedGlobalSearchQuery = {
  freeText: string;
  status: TaskStatusFilter | null;
  priority: TaskPriority | null;
  categoryName: string | null;
  labelName: string | null;
  overdue: boolean;
  today: boolean;
  reminder: boolean;
  recurring: boolean;
  recurrence: TaskRecurrence | null;
};

export type GlobalSearchQuickFilter = {
  id: string;
  label: string;
  href: string;
};

export type GlobalSearchTaskResult = {
  id: string;
  title: string;
  href: string;
  meta: string;
};

export type GlobalSearchCategoryResult = {
  id: string;
  label: string;
  href: string;
};

export type GlobalSearchLabelResult = {
  id: string;
  label: string;
  href: string;
};

export type GlobalSearchResults = {
  quickFilters: GlobalSearchQuickFilter[];
  tasks: GlobalSearchTaskResult[];
  categories: GlobalSearchCategoryResult[];
  labels: GlobalSearchLabelResult[];
};

const RECURRENCE_KEYWORDS: TaskRecurrence[] = [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
];

function emptyListState(
  overrides: Partial<TasksListQueryState> = {},
): TasksListQueryState {
  return {
    categoryFilter: { type: "all" },
    labelFilter: { type: "all" },
    statusFilter: "open",
    searchQuery: "",
    sort: DEFAULT_TASK_SORT,
    ...overrides,
  };
}

export function parseGlobalSearchQuery(raw: string): ParsedGlobalSearchQuery {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  let freeTextParts: string[] = [];
  let status: TaskStatusFilter | null = null;
  let priority: TaskPriority | null = null;
  let categoryName: string | null = null;
  let labelName: string | null = null;
  let overdue = false;
  let today = false;
  let reminder = false;
  let recurring = false;
  let recurrence: TaskRecurrence | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();

    if (lower === "overdue") {
      overdue = true;
      continue;
    }
    if (lower === "today") {
      today = true;
      continue;
    }
    if (lower === "reminder" || lower === "reminders") {
      reminder = true;
      continue;
    }
    if (lower === "recurring" || lower === "recurrence") {
      recurring = true;
      continue;
    }
    if (RECURRENCE_KEYWORDS.includes(lower as TaskRecurrence)) {
      recurrence = lower as TaskRecurrence;
      continue;
    }

    const priorityMatch = lower.match(/^priority:(.+)$/);
    if (priorityMatch) {
      const value = priorityMatch[1];
      if (isTaskPriority(value)) {
        priority = value;
      }
      continue;
    }

    const statusMatch = lower.match(/^status:(.+)$/);
    if (statusMatch) {
      const value = statusMatch[1];
      if (value === "open" || value === "completed" || value === "cancelled" || value === "all") {
        status = value;
      }
      continue;
    }

    const categoryMatch = token.match(/^category:(.+)$/i);
    if (categoryMatch) {
      categoryName = categoryMatch[1].trim();
      continue;
    }

    const labelMatch = token.match(/^label:(.+)$/i);
    if (labelMatch) {
      labelName = labelMatch[1].trim();
      continue;
    }

    freeTextParts.push(token);
  }

  return {
    freeText: freeTextParts.join(" ").trim().toLowerCase(),
    status,
    priority,
    categoryName,
    labelName,
    overdue,
    today,
    reminder,
    recurring,
    recurrence,
  };
}

function categoryMatchesName(category: Category, name: string) {
  return category.name.toLowerCase() === name.toLowerCase();
}

function findCategoriesByName(categories: Category[], name: string) {
  return categories.filter((category) => categoryMatchesName(category, name));
}

function findLabelsByName(labels: Label[], name: string) {
  return labels.filter(
    (label) => label.name.toLowerCase() === name.toLowerCase(),
  );
}

function taskMatchesParsed(
  task: GlobalSearchTask,
  parsed: ParsedGlobalSearchQuery,
  snapshot: GlobalSearchSnapshot,
  categoryLookup: Map<string, Category>,
  labelLookup: Map<string, Label>,
  now: Date,
): boolean {
  if (parsed.status === "open") {
    if (!isTaskOpen(task)) {
      return false;
    }
  } else if (parsed.status === "completed") {
    if (!task.completed) {
      return false;
    }
  } else if (parsed.status === "cancelled") {
    if (!isTaskCancelled(task)) {
      return false;
    }
  } else if (parsed.status === "all") {
    // include everything
  } else {
    // Default: hide cancelled (same spirit as Open list), still allow completed matches.
    if (isTaskCancelled(task)) {
      return false;
    }
  }

  if (parsed.priority) {
    if (parseTaskPriority(task.priority) !== parsed.priority) {
      return false;
    }
  }

  if (parsed.overdue) {
    if (
      !isTaskOpen(task) ||
      !task.due_at ||
      !isFocusDueOverdue(task.due_at, now)
    ) {
      return false;
    }
  }

  if (parsed.today) {
    if (
      !isTaskOpen(task) ||
      !task.due_at ||
      !isFocusDueToday(task.due_at, now)
    ) {
      return false;
    }
  }

  if (parsed.reminder) {
    if (!task.reminder_at) {
      return false;
    }
  }

  const recurrence = parseTaskRecurrence(task.recurrence);
  if (parsed.recurring && recurrence === "none") {
    return false;
  }
  if (parsed.recurrence && recurrence !== parsed.recurrence) {
    return false;
  }

  if (parsed.categoryName) {
    const matchedIds = new Set(
      findCategoriesByName(snapshot.categories, parsed.categoryName).map(
        (category) => category.id,
      ),
    );
    // Main category name also matches tasks on its subs.
    for (const category of snapshot.categories) {
      if (
        category.parent_id &&
        matchedIds.has(category.parent_id) === false
      ) {
        const parent = categoryLookup.get(category.parent_id);
        if (
          parent &&
          categoryMatchesName(parent, parsed.categoryName)
        ) {
          matchedIds.add(category.id);
        }
      }
      if (matchedIds.has(category.id) && !category.parent_id) {
        for (const child of snapshot.categories) {
          if (child.parent_id === category.id) {
            matchedIds.add(child.id);
          }
        }
      }
    }
    if (!task.category_id || !matchedIds.has(task.category_id)) {
      return false;
    }
  }

  if (parsed.labelName) {
    const matchedLabelIds = new Set(
      findLabelsByName(snapshot.labels, parsed.labelName).map(
        (label) => label.id,
      ),
    );
    const taskLabelIds = snapshot.labelIdsByTaskId[task.id] ?? [];
    if (!taskLabelIds.some((labelId) => matchedLabelIds.has(labelId))) {
      return false;
    }
  }

  if (parsed.freeText) {
    const title = task.title.toLowerCase();
    const description = (task.description ?? "").toLowerCase();
    if (title.includes(parsed.freeText) || description.includes(parsed.freeText)) {
      return true;
    }

    const category = getCategoryDisplay(task.category_id, categoryLookup);
    if (category?.label.toLowerCase().includes(parsed.freeText)) {
      return true;
    }

    const taskLabelIds = snapshot.labelIdsByTaskId[task.id] ?? [];
    for (const labelId of taskLabelIds) {
      const label = labelLookup.get(labelId);
      if (label?.name.toLowerCase().includes(parsed.freeText)) {
        return true;
      }
    }

    return false;
  }

  return true;
}

function buildTaskMeta(
  task: GlobalSearchTask,
  categoryLookup: Map<string, Category>,
): string {
  const parts: string[] = [];
  if (isTaskCancelled(task)) {
    parts.push("Cancelled");
  } else {
    parts.push(task.completed ? "Completed" : "Open");
  }
  parts.push(parseTaskPriority(task.priority));
  const category = getCategoryDisplay(task.category_id, categoryLookup);
  if (category) {
    parts.push(category.label);
  }
  return parts.join(" · ");
}

function buildQuickFilters(
  parsed: ParsedGlobalSearchQuery,
  rawQuery: string,
  snapshot: GlobalSearchSnapshot,
): GlobalSearchQuickFilter[] {
  const filters: GlobalSearchQuickFilter[] = [];
  const lower = rawQuery.trim().toLowerCase();

  const maybeAdd = (filter: GlobalSearchQuickFilter) => {
    if (!filters.some((entry) => entry.id === filter.id)) {
      filters.push(filter);
    }
  };

  if (parsed.overdue || lower === "overdue" || lower.includes("overdue")) {
    maybeAdd({
      id: "focus-overdue",
      label: "Overdue tasks",
      href: "/dashboard/focus",
    });
  }
  if (parsed.today || lower === "today" || /(^|\s)today(\s|$)/.test(lower)) {
    maybeAdd({
      id: "focus-today",
      label: "Due today",
      href: "/dashboard/focus",
    });
  }
  if (parsed.reminder || lower.includes("reminder")) {
    maybeAdd({
      id: "focus-reminder",
      label: "Reminders",
      href: "/dashboard/focus",
    });
  }

  if (parsed.status === "open" || lower.includes("status:open")) {
    maybeAdd({
      id: "status-open",
      label: "Open tasks",
      href: buildTasksFilterUrl(
        "/dashboard/tasks",
        emptyListState({ statusFilter: "open" }),
      ),
    });
  }
  if (parsed.status === "completed" || lower.includes("status:completed")) {
    maybeAdd({
      id: "status-completed",
      label: "Completed tasks",
      href: buildTasksFilterUrl(
        "/dashboard/tasks",
        emptyListState({ statusFilter: "completed" }),
      ),
    });
  }
  if (parsed.status === "cancelled" || lower.includes("status:cancelled")) {
    maybeAdd({
      id: "status-cancelled",
      label: "Cancelled tasks",
      href: buildTasksFilterUrl(
        "/dashboard/tasks",
        emptyListState({ statusFilter: "cancelled" }),
      ),
    });
  }

  if (parsed.priority || lower.startsWith("priority:")) {
    const sort: TaskSortOption = "priority_desc";
    maybeAdd({
      id: "priority-sort",
      label: parsed.priority
        ? `Priority: ${parsed.priority}`
        : "Sort by priority",
      href: buildTasksFilterUrl(
        "/dashboard/tasks",
        emptyListState({ sort }),
      ),
    });
  }

  if (parsed.recurring || parsed.recurrence) {
    maybeAdd({
      id: "recurring",
      label: parsed.recurrence
        ? `Recurring: ${parsed.recurrence}`
        : "Recurring tasks",
      href: buildTasksFilterUrl(
        "/dashboard/tasks",
        emptyListState({
          searchQuery: parsed.recurrence ?? "recurring",
          statusFilter: "open",
        }),
      ),
    });
  }

  if (parsed.categoryName) {
    const matches = findCategoriesByName(
      snapshot.categories,
      parsed.categoryName,
    );
    for (const category of matches.slice(0, 3)) {
      maybeAdd({
        id: `category-filter-${category.id}`,
        label: `Category: ${category.name}`,
        href: buildTasksFilterUrl(
          "/dashboard/tasks",
          emptyListState({
            categoryFilter:
              category.parent_id === null
                ? { type: "main", mainCategoryId: category.id }
                : {
                    type: "sub",
                    subCategoryId: category.id,
                  },
          }),
        ),
      });
    }
  }

  if (parsed.labelName) {
    const matches = findLabelsByName(snapshot.labels, parsed.labelName);
    for (const label of matches.slice(0, 3)) {
      maybeAdd({
        id: `label-filter-${label.id}`,
        label: `Label: ${label.name}`,
        href: buildTasksFilterUrl(
          "/dashboard/tasks",
          emptyListState({
            labelFilter: { type: "label", labelId: label.id },
          }),
        ),
      });
    }
  }

  return filters;
}

export function runGlobalSearch(
  rawQuery: string,
  snapshot: GlobalSearchSnapshot,
  now = new Date(),
): GlobalSearchResults {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      quickFilters: [],
      tasks: [],
      categories: [],
      labels: [],
    };
  }

  const parsed = parseGlobalSearchQuery(trimmed);
  const categoryLookup = new Map(
    snapshot.categories.map((category) => [category.id, category]),
  );
  const labelLookup = new Map(
    snapshot.labels.map((label) => [label.id, label]),
  );

  const quickFilters = buildQuickFilters(parsed, trimmed, snapshot);

  const tasks = snapshot.tasks
    .filter((task) =>
      taskMatchesParsed(
        task,
        parsed,
        snapshot,
        categoryLookup,
        labelLookup,
        now,
      ),
    )
    .slice(0, GLOBAL_SEARCH_TASK_LIMIT)
    .map((task) => ({
      id: task.id,
      title: task.title,
      href: `/dashboard/tasks?edit=${encodeURIComponent(task.id)}`,
      meta: buildTaskMeta(task, categoryLookup),
    }));

  const free = parsed.freeText;
  const categoryQuery = parsed.categoryName?.toLowerCase() ?? free;
  const categories =
    categoryQuery.length > 0
      ? snapshot.categories
          .filter((category) =>
            category.name.toLowerCase().includes(categoryQuery),
          )
          .slice(0, GLOBAL_SEARCH_CATEGORY_LIMIT)
          .map((category) => {
            const display = getCategoryDisplay(category.id, categoryLookup);
            return {
              id: category.id,
              label: display?.label ?? category.name,
              href: buildTasksFilterUrl(
                "/dashboard/tasks",
                emptyListState({
                  categoryFilter:
                    category.parent_id === null
                      ? { type: "main", mainCategoryId: category.id }
                      : {
                          type: "sub",
                          subCategoryId: category.id,
                        },
                }),
              ),
            };
          })
      : [];

  const labelQuery = parsed.labelName?.toLowerCase() ?? free;
  const labels =
    labelQuery.length > 0
      ? snapshot.labels
          .filter((label) => label.name.toLowerCase().includes(labelQuery))
          .slice(0, GLOBAL_SEARCH_LABEL_LIMIT)
          .map((label) => ({
            id: label.id,
            label: label.name,
            href: buildTasksFilterUrl(
              "/dashboard/tasks",
              emptyListState({
                labelFilter: { type: "label", labelId: label.id },
              }),
            ),
          }))
      : [];

  return { quickFilters, tasks, categories, labels };
}

export function globalSearchHasResults(results: GlobalSearchResults) {
  return (
    results.quickFilters.length > 0 ||
    results.tasks.length > 0 ||
    results.categories.length > 0 ||
    results.labels.length > 0
  );
}
