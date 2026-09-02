import { TasksClient } from "@/components/tasks/tasks-client";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import { loadAccessibleCategories } from "@/lib/categories/access";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { loadTaskCreatorProfiles } from "@/lib/tasks/creators";
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
  const { edit: editParam } = await searchParams;
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
        "id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, priority, recurrence, completed, created_at, category_id, user_id",
      )
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
  const activeCategories = categoriesResult.categories;
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  let historyError: string | null = null;
  let historyByTaskId: ReturnType<typeof aggregateDueDateHistoryCounts> = {};
  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let subtasksError: string | null = null;
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  const allTasks = (tasks ?? []) as Array<{
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
    created_at: string;
    category_id: string | null;
    user_id: string;
  }>;

  const taskIds = allTasks.map((task) => task.id);

  if (taskIds.length > 0) {
    const [
      historyResult,
      taskLabelsResult,
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

    if (historyResult.error) {
      historyError = historyResult.error.message;
    } else {
      historyByTaskId = aggregateDueDateHistoryCounts(
        historyResult.data ?? [],
      );
    }

    if (taskLabelsResult.error) {
      taskLabelsError = taskLabelsResult.error.message;
    } else {
      for (const row of taskLabelsResult.data ?? []) {
        const list = labelIdsByTaskId[row.task_id] ?? [];
        list.push(row.label_id);
        labelIdsByTaskId[row.task_id] = list;
      }
    }

    subtasksError = subtasksResult.error;
    subtasksByTaskId = subtasksResult.subtasksByTaskId;
  }

  const currentUserId = user?.id ?? "";
  const isAdmin = isAdminUser(user?.email);
  const creatorUserIds = [
    ...new Set(
      allTasks
        .map((task) => task.user_id)
        .filter((taskUserId) => taskUserId !== currentUserId),
    ),
  ];
  const creatorsByUserId = await loadTaskCreatorProfiles(
    supabase,
    creatorUserIds,
  );

  const errors = [
    error?.message ? `Could not load tasks: ${error.message}` : null,
    labelsError?.message
      ? `Could not load labels: ${labelsError.message}`
      : null,
    labelCategoryLinksError?.message
      ? `Could not load label category links: ${labelCategoryLinksError.message}`
      : null,
    categoriesError?.message
      ? `Could not load categories: ${categoriesError.message}`
      : null,
    taskLabelsError ? `Could not load task labels: ${taskLabelsError}` : null,
    historyError ? `Could not load due date history: ${historyError}` : null,
    subtasksError ? `Could not load subtasks: ${subtasksError}` : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <>
      <DashboardHeader title="Tasks" email={user?.email} />
      <div className="flex-1 overflow-auto overflow-x-hidden p-3 sm:p-4 lg:p-5">
        <Suspense
          fallback={
            <div className="min-h-10 text-sm text-stone-500 dark:text-stone-400">
              Loading tasks...
            </div>
          }
        >
          <TasksClient
            tasks={allTasks}
            categories={activeCategories}
            labels={activeLabels}
            categoryIdsByLabelId={categoryIdsByLabelId}
            labelIdsByTaskId={labelIdsByTaskId}
            subtasksByTaskId={subtasksByTaskId}
            historyByTaskId={historyByTaskId}
            creatorsByUserId={creatorsByUserId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            editTaskId={editParam ?? null}
            errors={errors}
          />
        </Suspense>
      </div>
    </>
  );
}
