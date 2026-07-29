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
import type { CalendarModalTask, CalendarTask } from "@/lib/tasks/calendar";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { getListFetchBounds } from "@/lib/tasks/local-dates";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import { getSubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RawTaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  completed: boolean;
  created_at: string;
  category_id: string | null;
};

const TASK_SELECT =
  "id, title, description, due_at, completed, created_at, category_id";

export type CalendarFetchResult = {
  calendarTasks: CalendarTask[];
  modalTasksById: Record<string, CalendarModalTask>;
  error: string | null;
  categoriesError: string | null;
  labelsError: string | null;
  taskLabelsError: string | null;
  historyError: string | null;
  subtasksError: string | null;
  categories: Category[];
  labels: Label[];
};

type FetchCalendarPageDataOptions =
  | { mode: "range"; start: Date; end: Date }
  | { mode: "list"; now?: Date };

export async function fetchCalendarPageData(
  supabase: SupabaseClient,
  options: FetchCalendarPageDataOptions,
): Promise<CalendarFetchResult> {
  let tasksQuery = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .not("due_at", "is", null)
    .order("due_at", { ascending: true });

  if (options.mode === "range") {
    tasksQuery = tasksQuery
      .gte("due_at", options.start.toISOString())
      .lte("due_at", options.end.toISOString());
  } else {
    const { upcomingEnd } = getListFetchBounds(options.now);
    tasksQuery = tasksQuery.lte("due_at", upcomingEnd.toISOString());
  }

  const [
    { data: tasks, error },
    { data: categories, error: categoriesError },
    { data: labels, error: labelsError },
  ] = await Promise.all([
    tasksQuery,
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
  let historyError: string | null = null;
  let subtasksError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let historyByTaskId = aggregateDueDateHistoryCounts([]);
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((task) => task.id);
    const [
      { data: taskLabelRows, error: taskLabelsFetchError },
      { data: changes, error: changesError },
      subtasksResult,
    ] = await Promise.all([
      supabase
        .from("task_labels")
        .select("task_id, label_id")
        .in("task_id", taskIds),
      supabase
        .from("task_due_date_changes")
        .select("task_id, change_direction")
        .in("task_id", taskIds),
      fetchSubtasksByTaskId(supabase, taskIds),
    ]);

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

    if (changesError) {
      historyError = changesError.message;
    } else {
      historyByTaskId = aggregateDueDateHistoryCounts(changes ?? []);
    }

    subtasksError = subtasksResult.error;
    subtasksByTaskId = subtasksResult.subtasksByTaskId;
  }

  const calendarTasks: CalendarTask[] = [];
  const modalTasksById: Record<string, CalendarModalTask> = {};

  for (const task of (tasks ?? []) as RawTaskRow[]) {
    const category = getCategoryDisplay(task.category_id, categoryLookup);
    const categoryUnavailable = task.category_id !== null && category === null;
    const taskLabelIds = labelIdsByTaskId[task.id] ?? [];
    const taskLabelDisplay = resolveTaskLabelDisplay(taskLabelIds, labelLookup);
    const dueDateHistory = historyByTaskId[task.id] ?? {
      dueDateUpdateCount: 0,
      movedLaterCount: 0,
      movedEarlierCount: 0,
    };

    const taskSubtasks = subtasksByTaskId[task.id] ?? [];

    calendarTasks.push({
      id: task.id,
      title: task.title,
      dueAt: task.due_at,
      completed: task.completed,
      category,
      categoryUnavailable,
      labels: taskLabelDisplay.labels,
      unavailableLabelCount: taskLabelDisplay.unavailableCount,
      subtaskProgress: getSubtaskProgress(taskSubtasks),
    });

    modalTasksById[task.id] = {
      id: task.id,
      title: task.title,
      description: task.description,
      dueAt: task.due_at,
      completed: task.completed,
      createdAt: task.created_at,
      categoryId: task.category_id,
      category,
      categoryUnavailable,
      labelIds: taskLabelIds,
      taskLabels: taskLabelDisplay,
      dueDateHistory,
      subtasks: taskSubtasks,
    };
  }

  return {
    calendarTasks,
    modalTasksById,
    error: error?.message ?? null,
    categoriesError: categoriesError?.message ?? null,
    labelsError: labelsError?.message ?? null,
    taskLabelsError,
    historyError,
    subtasksError,
    categories: activeCategories,
    labels: activeLabels,
  };
}
