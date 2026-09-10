import { FocusClient, type FocusClientTask } from "@/components/focus/focus-client";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import { loadAccessibleCategories } from "@/lib/categories/access";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import { LABEL_SELECT_FIELDS, type Label } from "@/lib/labels/types";
import {
  collectTaskPeopleIds,
  loadTaskCreatorProfiles,
} from "@/lib/tasks/creators";
import { fetchSubtasksByTaskId } from "@/lib/tasks/subtasks/group";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { createClient } from "@/lib/supabase/server";

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

  const openTasks = (tasks ?? []) as FocusClientTask[];
  const activeCategories = categoriesResult.categories;
  const activeLabels = (labels ?? []) as Label[];
  const categoryIdsByLabelId = groupCategoryIdsByLabel(
    (labelCategoryLinks ?? []) as LabelCategoryLink[],
  );
  const currentUserId = user?.id ?? "";
  const isAdmin = isAdminUser(user?.email);
  const peopleByUserId = await loadTaskCreatorProfiles(
    supabase,
    collectTaskPeopleIds(openTasks, currentUserId),
  );

  let taskLabelsError: string | null = null;
  let labelIdsByTaskId: Record<string, string[]> = {};
  let subtasksError: string | null = null;
  let subtasksByTaskId: Record<string, TaskSubtask[]> = {};

  if (openTasks.length > 0) {
    const taskIds = openTasks.map((task) => task.id);
    const [
      { data: taskLabelRows, error: taskLabelsFetchError },
      subtasksResult,
    ] = await Promise.all([
      supabase
        .from("task_labels")
        .select("task_id, label_id")
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

    subtasksError = subtasksResult.error;
    subtasksByTaskId = subtasksResult.subtasksByTaskId;
  }

  const openCount = openTasks.length;

  const warnings = [
    categoriesResult.error
      ? `Could not load categories: ${categoriesResult.error.message}`
      : null,
    labelsError ? `Could not load labels: ${labelsError.message}` : null,
    labelCategoryLinksError
      ? `Could not load label category links: ${labelCategoryLinksError.message}`
      : null,
    taskLabelsError ? `Could not load task labels: ${taskLabelsError}` : null,
    subtasksError ? `Could not load subtasks: ${subtasksError}` : null,
  ].filter((message): message is string => Boolean(message));

  return (
    <>
      <DashboardHeader
        title="Focus"
        description={
          !error && openCount === 0
            ? "Your daily command centre is clear"
            : `${openCount} open task${openCount === 1 ? "" : "s"}`
        }
        email={user?.email}
      />
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <FocusClient
          tasks={openTasks}
          categories={activeCategories}
          labels={activeLabels}
          categoryIdsByLabelId={categoryIdsByLabelId}
          labelIdsByTaskId={labelIdsByTaskId}
          subtasksByTaskId={subtasksByTaskId}
          peopleByUserId={peopleByUserId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          loadError={error ? `Could not load tasks: ${error.message}` : null}
          warnings={warnings}
        />
      </div>
    </>
  );
}
