import { isAdminUser } from "@/lib/admin";
import { loadAccessibleCategories } from "@/lib/categories/access";
import {
  buildCategoryLookup,
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
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import type { CalendarModalTask, CalendarTask } from "@/lib/tasks/calendar";
import {
  canDeleteSharedTask,
  loadTaskCreatorProfiles,
  type TaskCreatorProfile,
} from "@/lib/tasks/creators";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import { getListFetchBounds } from "@/lib/tasks/local-dates";
import { parseTaskPriority } from "@/lib/tasks/priority";
import { parseTaskRecurrence } from "@/lib/tasks/recurrence";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import { getSubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RawTaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  reminder_at: string | null;
  reminder_mode: string | null;
  reminder_offset_minutes: number | null;
  priority: string;
  recurrence: string;
  completed: boolean;
  created_at: string;
  category_id: string | null;
  user_id: string;
};

const TASK_SELECT =
  "id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, priority, recurrence, completed, created_at, category_id, user_id";

export type CalendarFetchResult = {
  calendarTasks: CalendarTask[];
  modalTasksById: Record<string, CalendarModalTask>;
  error: string | null;
  categoriesError: string | null;
  labelsError: string | null;
  labelCategoryLinksError: string | null;
  taskLabelsError: string | null;
  historyError: string | null;
  subtasksError: string | null;
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
  currentUserId: string | null;
  creatorsByUserId: Record<string, TaskCreatorProfile>;
};

type FetchCalendarPageDataOptions =
  | { mode: "range"; start: Date; end: Date }
  | { mode: "list"; now?: Date };

export async function fetchCalendarPageData(
  supabase: SupabaseClient,
  options: FetchCalendarPageDataOptions,
): Promise<CalendarFetchResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isAdmin = isAdminUser(user?.email);

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

  const categoriesResult = await loadAccessibleCategories(supabase);

  const [
    { data: tasks, error },
    { data: labels, error: labelsError },
    { data: labelCategoryLinks, error: labelCategoryLinksError },
  ] = await Promise.all([
    tasksQuery,
    supabase
      .from("labels")
      .select(LABEL_SELECT_FIELDS)
      .eq("active", true)
      .order("scope", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("label_categories").select(LABEL_CATEGORY_LINK_FIELDS),
  ]);

  const categoriesError = categoriesResult.error;
  const activeCategories = categoriesResult.categories;
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  const categoryLookup = buildCategoryLookup(activeCategories);
  const labelLookup = buildLabelLookup(activeLabels);

  let taskLabelsError: string | null = null;
  let historyError: string | null = null;
  let subtasksError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let historyByTaskId = aggregateDueDateHistoryCounts([]);
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  const rawTasks = (tasks ?? []) as RawTaskRow[];

  if (rawTasks.length > 0) {
    const taskIds = rawTasks.map((task) => task.id);
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

  const otherCreatorIds = rawTasks
    .map((task) => task.user_id)
    .filter((id) => id && id !== currentUserId);
  const creatorsByUserId = await loadTaskCreatorProfiles(
    supabase,
    otherCreatorIds,
  );

  const calendarTasks: CalendarTask[] = [];
  const modalTasksById: Record<string, CalendarModalTask> = {};

  for (const task of rawTasks) {
    const category = getCategoryDisplay(task.category_id, categoryLookup);
    const categoryUnavailable = task.category_id !== null && category === null;
    const categoryRow = task.category_id
      ? categoryLookup.get(task.category_id)
      : undefined;
    const taskLabelIds = labelIdsByTaskId[task.id] ?? [];
    const taskLabelDisplay = resolveTaskLabelDisplay(taskLabelIds, labelLookup);
    const dueDateHistory = historyByTaskId[task.id] ?? {
      dueDateUpdateCount: 0,
      movedLaterCount: 0,
      movedEarlierCount: 0,
    };

    const taskSubtasks = subtasksByTaskId[task.id] ?? [];
    const canDelete = currentUserId
      ? canDeleteSharedTask({
          currentUserId,
          isAdmin,
          taskUserId: task.user_id,
          categoryId: task.category_id,
          categoryScope: categoryRow?.scope ?? null,
        })
      : false;

    calendarTasks.push({
      id: task.id,
      title: task.title,
      dueAt: task.due_at,
      completed: task.completed,
      priority: parseTaskPriority(task.priority),
      recurrence: parseTaskRecurrence(task.recurrence),
      reminderAt: task.reminder_at,
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
      reminderAt: task.reminder_at,
      reminderMode: task.reminder_mode,
      reminderOffsetMinutes: task.reminder_offset_minutes,
      priority: parseTaskPriority(task.priority),
      recurrence: parseTaskRecurrence(task.recurrence),
      completed: task.completed,
      createdAt: task.created_at,
      categoryId: task.category_id,
      category,
      categoryUnavailable,
      labelIds: taskLabelIds,
      taskLabels: taskLabelDisplay,
      dueDateHistory,
      subtasks: taskSubtasks,
      taskUserId: task.user_id,
      canDelete,
      creator:
        task.user_id !== currentUserId
          ? (creatorsByUserId[task.user_id] ?? null)
          : null,
    };
  }

  return {
    calendarTasks,
    modalTasksById,
    error: error?.message ?? null,
    categoriesError: categoriesError?.message ?? null,
    labelsError: labelsError?.message ?? null,
    labelCategoryLinksError: labelCategoryLinksError?.message ?? null,
    taskLabelsError,
    historyError,
    subtasksError,
    categories: activeCategories,
    labels: activeLabels,
    categoryIdsByLabelId,
    currentUserId,
    creatorsByUserId,
  };
}
