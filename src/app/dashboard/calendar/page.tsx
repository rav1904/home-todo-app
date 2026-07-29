import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  buildCategoryLookup,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import {
  buildLabelLookup,
  resolveTaskLabelDisplay,
} from "@/lib/labels/display";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import {
  buildMonthGrid,
  groupCalendarTasksByDay,
  type CalendarTask,
} from "@/lib/tasks/calendar";
import {
  formatMonthLabel,
  formatMonthParam,
  getMonthBounds,
  parseMonthParam,
  shiftMonth,
} from "@/lib/tasks/local-dates";
import { createClient } from "@/lib/supabase/server";

type CalendarPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonthParam(monthParam);
  const { start, end } = getMonthBounds(year, month);
  const previousMonth = shiftMonth(year, month, -1);
  const nextMonth = shiftMonth(year, month, 1);
  const todayMonthParam = formatMonthParam(
    new Date().getFullYear(),
    new Date().getMonth(),
  );

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
      .select("id, title, due_at, completed, category_id")
      .not("due_at", "is", null)
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString())
      .order("due_at", { ascending: true }),
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
  const categoryLookup = buildCategoryLookup(activeCategories);
  const labelLookup = buildLabelLookup(activeLabels);

  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};

  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((task) => task.id);
    const { data: taskLabelRows, error: taskLabelsFetchError } = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .in("task_id", taskIds);

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

  const calendarTasks: CalendarTask[] = (tasks ?? []).map((task) => {
    const category = getCategoryDisplay(task.category_id, categoryLookup);
    const categoryUnavailable = task.category_id !== null && category === null;
    const taskLabelIds = labelIdsByTaskId[task.id] ?? [];
    const taskLabelDisplay = resolveTaskLabelDisplay(taskLabelIds, labelLookup);

    return {
      id: task.id,
      title: task.title,
      dueAt: task.due_at as string,
      completed: task.completed,
      category,
      categoryUnavailable,
      labels: taskLabelDisplay.labels,
      unavailableLabelCount: taskLabelDisplay.unavailableCount,
    };
  });

  const days = buildMonthGrid(year, month);
  const tasksByDay = groupCalendarTasksByDay(calendarTasks);

  return (
    <>
      <DashboardHeader
        title="Calendar"
        description="Tasks grouped by due date"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load tasks: {error.message}
          </div>
        ) : null}

        {categoriesError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load categories: {categoriesError.message}
          </div>
        ) : null}

        {labelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load labels: {labelsError.message}
          </div>
        ) : null}

        {taskLabelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load task labels: {taskLabelsError}
          </div>
        ) : null}

        {!error ? (
          <MonthCalendar
            monthLabel={formatMonthLabel(year, month)}
            prevMonthHref={`/dashboard/calendar?month=${formatMonthParam(previousMonth.year, previousMonth.month)}`}
            nextMonthHref={`/dashboard/calendar?month=${formatMonthParam(nextMonth.year, nextMonth.month)}`}
            todayHref={`/dashboard/calendar?month=${todayMonthParam}`}
            days={days}
            tasksByDay={tasksByDay}
          />
        ) : null}

        {!error && calendarTasks.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No tasks with due dates in {formatMonthLabel(year, month)}.
          </p>
        ) : null}
      </div>
    </>
  );
}
