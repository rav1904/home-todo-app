import type { ReactNode } from "react";
import { TaskListItem } from "@/components/tasks/task-list-item";
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
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import {
  buildFocusSections,
  focusSectionsAreEmpty,
  type FocusTaskLike,
} from "@/lib/tasks/focus";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { createClient } from "@/lib/supabase/server";

type FocusTask = FocusTaskLike & {
  title: string;
  description: string | null;
  reminder_mode: string | null;
  reminder_offset_minutes: number | null;
  priority: string | null;
  recurrence: string | null;
  category_id: string | null;
};

type FocusSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  tasks: FocusTask[];
  renderTask: (task: FocusTask) => ReactNode;
};

function FocusSection({
  title,
  description,
  emptyMessage,
  tasks,
  renderTask,
}: FocusSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {description}
      </p>
      <div className="mt-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-3">{tasks.map((task) => renderTask(task))}</ul>
        )}
      </div>
    </section>
  );
}

export default async function FocusPage() {
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
      .select(
        "id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, priority, recurrence, completed, created_at, category_id",
      )
      .eq("completed", false)
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

  const openTasks = (tasks ?? []) as FocusTask[];
  const activeCategories = (categories ?? []) as Category[];
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  const labelLookup = buildLabelLookup(activeLabels);
  const categoryLookup = buildCategoryLookup(activeCategories);

  let historyError: string | null = null;
  let historyByTaskId: ReturnType<typeof aggregateDueDateHistoryCounts> = {};
  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let subtasksError: string | null = null;
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  if (openTasks.length > 0) {
    const taskIds = openTasks.map((task) => task.id);
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

  const sections = buildFocusSections(openTasks);
  const allCaughtUp = !error && focusSectionsAreEmpty(sections);

  function renderTask(task: FocusTask) {
    const dueDateHistory = historyByTaskId[task.id] ?? {
      dueDateUpdateCount: 0,
      movedLaterCount: 0,
      movedEarlierCount: 0,
    };
    const category = getCategoryDisplay(task.category_id, categoryLookup);
    const categoryUnavailable = task.category_id !== null && category === null;
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
      />
    );
  }

  return (
    <>
      <DashboardHeader
        title="Focus"
        description="What needs attention now"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-6 lg:p-8">
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

        {labelCategoryLinksError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load label category links:{" "}
            {labelCategoryLinksError.message}
          </div>
        ) : null}

        {taskLabelsError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load task labels: {taskLabelsError}
          </div>
        ) : null}

        {historyError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load due date history: {historyError}
          </div>
        ) : null}

        {subtasksError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            Could not load subtasks: {subtasksError}
          </div>
        ) : null}

        {allCaughtUp ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm dark:border-stone-600 dark:bg-stone-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              ✓
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              All caught up
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
              Nothing overdue, due today, or flagged for focus right now.
            </p>
          </div>
        ) : !error ? (
          <>
            <FocusSection
              title="Overdue"
              description="Open tasks past their due date"
              emptyMessage="Nothing overdue."
              tasks={sections.overdue}
              renderTask={renderTask}
            />
            <FocusSection
              title="Due today"
              description="Open tasks due by end of today"
              emptyMessage="Nothing due today."
              tasks={sections.dueToday}
              renderTask={renderTask}
            />
            <FocusSection
              title="Reminders due now / overdue"
              description="Open tasks whose reminder time has passed"
              emptyMessage="No reminders due right now."
              tasks={sections.remindersDue}
              renderTask={renderTask}
            />
            <FocusSection
              title="High & urgent"
              description="High or urgent tasks not already listed above"
              emptyMessage="No other high or urgent tasks."
              tasks={sections.highUrgent}
              renderTask={renderTask}
            />
            <FocusSection
              title="Up next"
              description="Next few open tasks due after today"
              emptyMessage="Nothing upcoming with a due date."
              tasks={sections.upNext}
              renderTask={renderTask}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
