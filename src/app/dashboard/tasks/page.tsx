import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  filterTasksByCategory,
  parseCategoryFilterParam,
} from "@/lib/categories/filter";
import {
  buildCategoryLookup,
  buildCategoryTree,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import {
  buildLabelLookup,
  resolveTaskLabelDisplay,
} from "@/lib/labels/display";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { filterTasksByLabel, parseLabelFilterParam } from "@/lib/labels/filter";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import {
  getTaskFilterDescription,
  isAnyTaskFilterActive,
} from "@/lib/tasks/filter";
import { filterTasksBySearch, parseSearchQueryParam } from "@/lib/tasks/search";
import { parseSortParam, sortTasks } from "@/lib/tasks/sort";
import {
  filterTasksByStatus,
  parseStatusFilterParam,
} from "@/lib/tasks/status";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

type TasksPageProps = {
  searchParams: Promise<{
    category?: string;
    label?: string;
    edit?: string;
    q?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const {
    category: categoryParam,
    label: labelParam,
    edit: editParam,
    q: searchParam,
    status: statusParam,
    sort: sortParam,
  } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks, error },
    { data: categories, error: categoriesError },
    { data: labels, error: labelsError },
    { data: labelCategoryLinks, error: labelCategoryLinksError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, completed, created_at, category_id")
      .order("created_at", { ascending: false }),
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
    supabase.from("label_categories").select(LABEL_CATEGORY_LINK_FIELDS),
  ]);

  const activeCategories = (categories ?? []) as Category[];
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  const labelLookup = buildLabelLookup(activeLabels);
  const categoryLookup = buildCategoryLookup(activeCategories);
  const { subsByParent } = buildCategoryTree(activeCategories);
  const categoryFilter = parseCategoryFilterParam(categoryParam, categoryLookup);
  const labelFilter = parseLabelFilterParam(labelParam, labelLookup);
  const statusFilter = parseStatusFilterParam(statusParam);
  const searchQuery = parseSearchQueryParam(searchParam);
  const sort = parseSortParam(sortParam);
  const listQueryState = {
    categoryFilter,
    labelFilter,
    statusFilter,
    searchQuery,
    sort,
  };

  let historyError: string | null = null;
  let historyByTaskId: ReturnType<typeof aggregateDueDateHistoryCounts> = {};
  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let subtasksError: string | null = null;
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((task) => task.id);
    const [
      { data: changes, error: changesError },
      { data: taskLabelRows, error: taskLabelsFetchError },
      subtasksResult,
    ] = await Promise.all([
      supabase
        .from("task_due_date_changes")
        .select("task_id, change_direction")
        .in("task_id", taskIds),
      supabase
        .from("task_labels")
        .select("task_id, label_id")
        .in("task_id", taskIds),
      fetchSubtasksByTaskId(supabase, taskIds),
    ]);

    if (changesError) {
      historyError = changesError.message;
    } else {
      historyByTaskId = aggregateDueDateHistoryCounts(changes ?? []);
    }

    if (taskLabelsFetchError) {
      taskLabelsError = taskLabelsFetchError.message;
    } else {
      labelIdsByTaskId = (taskLabelRows ?? []).reduce<Record<string, string[]>>(
        (accumulator, row) => {
          if (!accumulator[row.task_id]) {
            accumulator[row.task_id] = [];
          }

          accumulator[row.task_id].push(row.label_id);
          return accumulator;
        },
        {},
      );
    }

    subtasksError = subtasksResult.error;
    subtasksByTaskId = subtasksResult.subtasksByTaskId;
  }

  const allTasks = tasks ?? [];
  const filteredByCategory = filterTasksByCategory(
    allTasks,
    categoryFilter,
    subsByParent,
  );
  const filteredByLabel = filterTasksByLabel(
    filteredByCategory,
    labelFilter,
    labelIdsByTaskId,
  );
  const filteredByStatus = filterTasksByStatus(filteredByLabel, statusFilter);
  const filteredBySearch = filterTasksBySearch(filteredByStatus, searchQuery);
  const filteredTasks = sortTasks(filteredBySearch, sort);
  const tasksToRender =
    editParam && !filteredTasks.some((task) => task.id === editParam)
      ? [
          ...allTasks.filter((task) => task.id === editParam),
          ...filteredTasks,
        ]
      : filteredTasks;
  const filterActive = isAnyTaskFilterActive(listQueryState);
  const filterDescription = getTaskFilterDescription(
    listQueryState,
    categoryLookup,
    labelLookup,
    subsByParent,
  );

  return (
    <>
      <DashboardHeader
        title="Tasks"
        description="View and manage tasks"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-8">
        <AddTaskForm
          categories={activeCategories}
          labels={activeLabels}
          categoryIdsByLabelId={categoryIdsByLabelId}
        />

        {labelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load labels: {labelsError.message}
          </div>
        ) : null}

        {labelCategoryLinksError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load label category links:{" "}
            {labelCategoryLinksError.message}
          </div>
        ) : null}

        <Suspense
          fallback={
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Loading filters...
              </p>
            </div>
          }
        >
          <TaskFiltersBar
            categories={activeCategories}
            labels={activeLabels}
          />
        </Suspense>

        {categoriesError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load categories: {categoriesError.message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Could not load tasks: {error.message}
          </div>
        ) : null}

        {taskLabelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load task labels: {taskLabelsError}
          </div>
        ) : null}

        {historyError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load due date history: {historyError}
          </div>
        ) : null}

        {subtasksError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load subtasks: {subtasksError}
          </div>
        ) : null}

        {allTasks.length > 0 && tasksToRender.length > 0 ? (
          <ul className="space-y-3">
            {tasksToRender.map((task) => {
              const dueDateHistory = historyByTaskId[task.id] ?? {
                dueDateUpdateCount: 0,
                movedLaterCount: 0,
                movedEarlierCount: 0,
              };
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
                  completed={task.completed}
                  createdAt={task.created_at}
                  categoryId={task.category_id}
                  category={category}
                  categoryUnavailable={categoryUnavailable}
                  categories={activeCategories}
                  labels={activeLabels}
                  categoryIdsByLabelId={categoryIdsByLabelId}
                  labelIds={taskLabelIds}
                  taskLabels={taskLabelDisplay}
                  dueDateHistory={dueDateHistory}
                  subtasks={subtasksByTaskId[task.id] ?? []}
                  initialEditing={editParam === task.id}
                />
              );
            })}
          </ul>
        ) : allTasks.length > 0 && filterActive ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm dark:border-stone-600 dark:bg-stone-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              ☑
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              No matching tasks
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
              {filterDescription
                ? `No tasks match “${filterDescription}”. Try adjusting or clearing your filters.`
                : "No tasks match these filters. Try adjusting or clearing your filters."}
            </p>
          </div>
        ) : !error ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm dark:border-stone-600 dark:bg-stone-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              ☑
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              No tasks yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
              Use the form above to add your first task.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
