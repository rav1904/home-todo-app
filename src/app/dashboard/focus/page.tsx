import type { ReactNode } from "react";
import { TaskListItem } from "@/components/tasks/task-list-item";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import { loadAccessibleCategories } from "@/lib/categories/access";
import {
  buildCategoryLookup,
  getCategoryDisplay,
} from "@/lib/categories/tree";
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
import {
  canDeleteSharedTask,
  collectTaskPeopleIds,
  loadTaskCreatorProfiles,
} from "@/lib/tasks/creators";
import { aggregateDueDateHistoryCounts } from "@/lib/tasks/due-date-change";
import {
  buildFocusSections,
  focusSectionsAreEmpty,
  type FocusTaskLike,
} from "@/lib/tasks/focus";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { createClient } from "@/lib/supabase/server";
import { Check } from "lucide-react";
import Link from "next/link";

type FocusTask = FocusTaskLike & {
  title: string;
  description: string | null;
  reminder_mode: string | null;
  reminder_offset_minutes: number | null;
  priority: string | null;
  recurrence: string | null;
  category_id: string | null;
  user_id: string;
  assigned_to: string | null;
  created_at: string;
};

type FocusSectionTone = "default" | "danger" | "warning";

type FocusSectionProps = {
  title: string;
  description: string;
  count: number;
  tone?: FocusSectionTone;
  tasks: FocusTask[];
  renderTask: (task: FocusTask) => ReactNode;
};

const toneStyles: Record<
  FocusSectionTone,
  { border: string; badge: string }
> = {
  default: {
    border: "border-stone-200/80 dark:border-stone-700/80",
    badge:
      "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  },
  danger: {
    border: "border-rose-200/80 dark:border-rose-900/40",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  warning: {
    border: "border-amber-200/80 dark:border-amber-900/40",
    badge:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

function FocusSection({
  title,
  description,
  count,
  tone = "default",
  tasks,
  renderTask,
}: FocusSectionProps) {
  if (tasks.length === 0) {
    return null;
  }

  const styles = toneStyles[tone];

  return (
    <section
      className={`rounded-xl border bg-white p-4 sm:p-5 dark:bg-stone-900 ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${styles.badge}`}
        >
          {count}
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">{tasks.map((task) => renderTask(task))}</ul>
    </section>
  );
}

function FocusEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center dark:border-stone-600 dark:bg-stone-900">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Check className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
        All caught up
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500 dark:text-stone-400">
        Nothing overdue, due today, or flagged for focus right now.
      </p>
      <Link
        href="/dashboard/tasks"
        className="mt-5 inline-flex cursor-pointer text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        Browse all tasks
      </Link>
    </div>
  );
}

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const categoriesResult = await loadAccessibleCategories(supabase);

  const [
    { data: tasks, error },
    { data: labels, error: labelsError },
    { data: labelCategoryLinks, error: labelCategoryLinksError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, priority, recurrence, completed, cancelled_at, created_at, category_id, user_id, assigned_to",
      )
      .eq("completed", false)
      .is("cancelled_at", null)
      .order("created_at", { ascending: false }),
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
  const openTasks = (tasks ?? []) as FocusTask[];
  const activeCategories = categoriesResult.categories;
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  const labelLookup = buildLabelLookup(activeLabels);
  const categoryLookup = buildCategoryLookup(activeCategories);
  const currentUserId = user?.id ?? "";
  const isAdmin = isAdminUser(user?.email);
  const creatorsByUserId = await loadTaskCreatorProfiles(
    supabase,
    collectTaskPeopleIds(openTasks, currentUserId),
  );

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
  const attentionCount =
    sections.overdue.length +
    sections.dueToday.length +
    sections.remindersDue.length +
    sections.highUrgent.length +
    sections.upNext.length;

  const warningMessages = [
    categoriesError
      ? `Could not load categories: ${categoriesError.message}`
      : null,
    labelsError ? `Could not load labels: ${labelsError.message}` : null,
    labelCategoryLinksError
      ? `Could not load label category links: ${labelCategoryLinksError.message}`
      : null,
    taskLabelsError ? `Could not load task labels: ${taskLabelsError}` : null,
    historyError ? `Could not load due date history: ${historyError}` : null,
    subtasksError ? `Could not load subtasks: ${subtasksError}` : null,
  ].filter((message): message is string => Boolean(message));

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
        cancelledAt={task.cancelled_at ?? null}
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
  }

  return (
    <>
      <DashboardHeader
        title="Focus"
        description={
          allCaughtUp
            ? "Your daily command centre is clear"
            : `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`
        }
        email={user?.email}
      />
      <div className="flex-1 space-y-5 overflow-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load tasks: {error.message}
          </div>
        ) : null}

        {warningMessages.length > 0 ? (
          <div className="space-y-2">
            {warningMessages.map((message) => (
              <div
                key={message}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
              >
                {message}
              </div>
            ))}
          </div>
        ) : null}

        {allCaughtUp ? (
          <FocusEmptyState />
        ) : !error ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <FocusSection
              title="Overdue"
              description="Past due — handle these first"
              count={sections.overdue.length}
              tone="danger"
              tasks={sections.overdue}
              renderTask={renderTask}
            />
            <FocusSection
              title="Due today"
              description="Due by end of today"
              count={sections.dueToday.length}
              tone="warning"
              tasks={sections.dueToday}
              renderTask={renderTask}
            />
            <FocusSection
              title="Reminders"
              description="Reminder time has passed"
              count={sections.remindersDue.length}
              tone="warning"
              tasks={sections.remindersDue}
              renderTask={renderTask}
            />
            <FocusSection
              title="High & urgent"
              description="Priority items not listed above"
              count={sections.highUrgent.length}
              tasks={sections.highUrgent}
              renderTask={renderTask}
            />
            <FocusSection
              title="Up next"
              description="Coming up after today"
              count={sections.upNext.length}
              tasks={sections.upNext}
              renderTask={renderTask}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
