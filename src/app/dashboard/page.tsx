import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardHomeClient } from "@/components/dashboard/dashboard-home-client";
import { isAdminUser } from "@/lib/admin";
import { fetchEffectiveDisplayName } from "@/lib/auth/effective-display-name";
import { getUserAvatarUrl } from "@/lib/auth/user-display";
import { loadAccessibleCategories } from "@/lib/categories/access";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import {
  collectTaskPeopleIds,
  loadTaskCreatorProfiles,
} from "@/lib/tasks/creators";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

type DashboardPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { edit: editParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tasks, error },
    categoriesResult,
    { data: labels, error: labelsError },
    { data: labelCategoryLinks, error: labelLinksError },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, due_at, reminder_at, reminder_mode, reminder_offset_minutes, priority, recurrence, completed, cancelled_at, created_at, category_id, user_id, assigned_to",
      )
      .order("created_at", { ascending: false }),
    loadAccessibleCategories(supabase),
    supabase
      .from("labels")
      .select(LABEL_SELECT_FIELDS)
      .eq("active", true)
      .order("scope", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("label_categories").select(LABEL_CATEGORY_LINK_FIELDS),
  ]);

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
    cancelled_at: string | null;
    created_at: string;
    category_id: string | null;
    user_id: string;
    assigned_to: string | null;
  }>;

  let labelIdsByTaskId: Record<string, string[]> = {};
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};
  let taskLabelsError: string | null = null;
  let subtasksError: string | null = null;

  const taskIds = allTasks.map((task) => task.id);
  if (taskIds.length > 0) {
    const [taskLabelsResult, subtasksResult] = await Promise.all([
      supabase
        .from("task_labels")
        .select("task_id, label_id")
        .in("task_id", taskIds),
      fetchSubtasksByTaskId(supabase, taskIds),
    ]);

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

  const displayName = await fetchEffectiveDisplayName(supabase, user, "there");
  const avatarUrl = getUserAvatarUrl(user?.user_metadata);
  const currentUserId = user?.id ?? "";
  const isAdmin = isAdminUser(user?.email);
  const peopleByUserId = await loadTaskCreatorProfiles(
    supabase,
    collectTaskPeopleIds(allTasks, currentUserId),
  );
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );

  const loadError =
    error?.message ??
    categoriesResult.error?.message ??
    labelsError?.message ??
    labelLinksError?.message ??
    taskLabelsError ??
    subtasksError ??
    null;

  return (
    <>
      <DashboardHeader title="Overview" email={user?.email} />
      <div className="flex-1 overflow-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
        <Suspense
          fallback={
            <div className="min-h-10 text-sm text-stone-500 dark:text-stone-400">
              Loading…
            </div>
          }
        >
          <DashboardHomeClient
            displayName={displayName}
            avatarUrl={avatarUrl}
            tasks={allTasks}
            categories={categoriesResult.categories}
            labels={activeLabels}
            categoryIdsByLabelId={categoryIdsByLabelId}
            labelIdsByTaskId={labelIdsByTaskId}
            subtasksByTaskId={subtasksByTaskId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            peopleByUserId={peopleByUserId}
            initialEditTaskId={editParam ?? null}
            loadError={loadError}
          />
        </Suspense>
      </div>
    </>
  );
}
