import { AddTaskForm } from "@/components/tasks/add-task-form";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  buildCategoryLookup,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks, error },
    { data: categories, error: categoriesError },
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
  ]);

  const activeCategories = (categories ?? []) as Category[];
  const categoryLookup = buildCategoryLookup(activeCategories);

  let historyError: string | null = null;
  let historyByTaskId: ReturnType<typeof aggregateDueDateHistoryCounts> = {};

  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((task) => task.id);
    const { data: changes, error: changesError } = await supabase
      .from("task_due_date_changes")
      .select("task_id, change_direction")
      .in("task_id", taskIds);

    if (changesError) {
      historyError = changesError.message;
    } else {
      historyByTaskId = aggregateDueDateHistoryCounts(changes ?? []);
    }
  }

  return (
    <>
      <DashboardHeader
        title="Tasks"
        description="View and manage tasks"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-8">
        <AddTaskForm categories={activeCategories} />

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

        {historyError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Could not load due date history: {historyError}
          </div>
        ) : null}

        {tasks && tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map((task) => {
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
                  dueDateHistory={dueDateHistory}
                />
              );
            })}
          </ul>
        ) : !error ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm">
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
