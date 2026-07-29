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
import { filterTasksByLabel, parseLabelFilterParam } from "@/lib/labels/filter";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import {
  getTaskFilterDescription,
  isAnyTaskFilterActive,
} from "@/lib/tasks/filter";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

type TasksPageProps = {
  searchParams: Promise<{ category?: string; label?: string; edit?: string }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { category: categoryParam, label: labelParam, edit: editParam } =
    await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks, error },
    { data: categories, error: categoriesError },
    { data: labels, error: labelsError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, due_at, completed, created_at, category_id")
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
  ]);

  const activeCategories = (categories ?? []) as Category[];
  const activeLabels = (labels ?? []) as Label[];
  const labelLookup = buildLabelLookup(activeLabels);
  const categoryLookup = buildCategoryLookup(activeCategories);
  const { subsByParent } = buildCategoryTree(activeCategories);
  const categoryFilter = parseCategoryFilterParam(categoryParam, categoryLookup);
  const labelFilter = parseLabelFilterParam(labelParam, labelLookup);

  let historyError: string | null = null;
  let historyByTaskId: ReturnType<typeof aggregateDueDateHistoryCounts> = {};
  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};

  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((task) => task.id);
    const [
      { data: changes, error: changesError },
      { data: taskLabelRows, error: taskLabelsFetchError },
    ] = await Promise.all([
      supabase
        .from("task_due_date_changes")
        .select("task_id, change_direction")
        .in("task_id", taskIds),
      supabase
        .from("task_labels")
        .select("task_id, label_id")
        .in("task_id", taskIds),
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
  }

  const allTasks = tasks ?? [];
  const filteredByCategory = filterTasksByCategory(
    allTasks,
    categoryFilter,
    subsByParent,
  );
  const filteredTasks = filterTasksByLabel(
    filteredByCategory,
    labelFilter,
    labelIdsByTaskId,
  );
  const tasksToRender =
    editParam && !filteredTasks.some((task) => task.id === editParam)
      ? [
          ...allTasks.filter((task) => task.id === editParam),
          ...filteredTasks,
        ]
      : filteredTasks;
  const filterActive = isAnyTaskFilterActive(categoryFilter, labelFilter);
  const filterDescription = getTaskFilterDescription(
    categoryFilter,
    labelFilter,
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
        <AddTaskForm categories={activeCategories} labels={activeLabels} />

        {labelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load labels: {labelsError.message}
          </div>
        ) : null}

        {activeCategories.length > 0 || activeLabels.length > 0 ? (
          <Suspense
            fallback={
              <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900 p-5 shadow-sm">
                <p className="text-sm text-stone-500">Loading filters...</p>
              </div>
            }
          >
            <TaskFiltersBar
              categories={activeCategories}
              labels={activeLabels}
            />
          </Suspense>
        ) : null}

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
                  completed={task.completed}
                  createdAt={task.created_at}
                  categoryId={task.category_id}
                  category={category}
                  categoryUnavailable={categoryUnavailable}
                  categories={activeCategories}
                  labels={activeLabels}
                  labelIds={taskLabelIds}
                  taskLabels={taskLabelDisplay}
                  dueDateHistory={dueDateHistory}
                  initialEditing={editParam === task.id}
                />
              );
            })}
          </ul>
        ) : allTasks.length > 0 && filterActive ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500">
              ☑
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900">
              No matching tasks
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              {filterDescription
                ? `No tasks match the "${filterDescription}" filter. Try adjusting or clearing your filters.`
                : "No tasks match these filters. Try adjusting or clearing your filters."}
            </p>
          </div>
        ) : !error ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900 p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500">
              ☑
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900">
              No tasks yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Use the form above to add your first task.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
