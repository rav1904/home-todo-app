"use client";

import { FocusBoard } from "@/components/focus/focus-board";
import { FocusSummary } from "@/components/focus/focus-summary";
import { FocusTaskCard } from "@/components/focus/focus-task-card";
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { NULL_CATEGORY_DISPLAY } from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import type { Label } from "@/lib/labels/types";
import {
  canDeleteSharedTask,
  shouldShowTaskCreator,
  type TaskCreatorProfile,
} from "@/lib/tasks/creators";
import {
  groupFocusTasksByAssignee,
  groupFocusTasksByCategory,
} from "@/lib/tasks/focus-board";
import type { FocusTaskLike } from "@/lib/tasks/focus";
import { getSubtaskProgress } from "@/lib/tasks/subtasks/progress";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import { compactFieldClassName, formLabelClassName } from "@/lib/ui/field-classes";
import { useMemo, useState } from "react";

export type FocusClientTask = FocusTaskLike & {
  title: string;
  description: string | null;
  reminder_mode: string | null;
  reminder_offset_minutes: number | null;
  priority: string | null;
  recurrence: string | null;
  category_id: string | null;
  user_id: string;
  assigned_to: string | null;
};

type FocusView = "category" | "assignee";

const ALL_FILTER = "all";

type FocusClientProps = {
  tasks: FocusClientTask[];
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
  labelIdsByTaskId: Record<string, string[]>;
  subtasksByTaskId: Record<string, TaskSubtask[]>;
  peopleByUserId: Record<string, TaskCreatorProfile>;
  currentUserId: string;
  isAdmin: boolean;
  loadError?: string | null;
  warnings?: string[];
};

export function FocusClient({
  tasks,
  categories,
  labels,
  categoryIdsByLabelId,
  labelIdsByTaskId,
  subtasksByTaskId,
  peopleByUserId,
  currentUserId,
  isAdmin,
  loadError = null,
  warnings = [],
}: FocusClientProps) {
  const [view, setView] = useState<FocusView>("category");
  const [filterId, setFilterId] = useState(ALL_FILTER);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const categoryLookup = useMemo(
    () => buildCategoryLookup(categories),
    [categories],
  );
  const tasksById = useMemo(() => {
    const map = new Map<string, FocusClientTask>();
    for (const task of tasks) {
      map.set(task.id, task);
    }
    return map;
  }, [tasks]);

  const categoryColumns = useMemo(
    () => groupFocusTasksByCategory(tasks, categories),
    [tasks, categories],
  );
  const assigneeColumns = useMemo(
    () => groupFocusTasksByAssignee(tasks, peopleByUserId, currentUserId),
    [tasks, peopleByUserId, currentUserId],
  );
  const columns = view === "category" ? categoryColumns : assigneeColumns;
  const selectedColumn =
    filterId === ALL_FILTER
      ? null
      : (columns.find((column) => column.id === filterId) ?? null);
  const boardColumns = selectedColumn ? [selectedColumn] : columns;
  const summaryTasks = boardColumns.flatMap((column) => column.tasks);
  const summaryScope = selectedColumn
    ? selectedColumn.title
    : view === "category"
      ? "All Categories"
      : "All Assignees";
  const editingTask = editingTaskId
    ? (tasksById.get(editingTaskId) ?? null)
    : null;

  function renderCard(task: FocusClientTask) {
    const category = getCategoryDisplay(task.category_id, categoryLookup);
    const categoryUnavailable =
      task.category_id !== null && category === null;
    const showAuthor = shouldShowTaskCreator({
      taskUserId: task.user_id,
      currentUserId,
      categoryId: task.category_id,
      categoryScope: categoryLookup.get(task.category_id ?? "")?.scope ?? null,
    });
    const isSubcategory = Boolean(
      task.category_id && categoryLookup.get(task.category_id)?.parent_id,
    );
    const showCategory =
      view === "assignee" || isSubcategory || categoryUnavailable;
    const progress = getSubtaskProgress(subtasksByTaskId[task.id] ?? []);

    return (
      <FocusTaskCard
        title={task.title}
        dueAt={task.due_at}
        priority={task.priority}
        reminderAt={task.reminder_at}
        reminderMode={task.reminder_mode}
        reminderOffsetMinutes={task.reminder_offset_minutes}
        recurrence={task.recurrence}
        category={
          category ??
          (categoryUnavailable ? null : NULL_CATEGORY_DISPLAY)
        }
        categoryUnavailable={categoryUnavailable}
        showCategory={showCategory}
        showAuthor={showAuthor}
        authorName={
          showAuthor
            ? (peopleByUserId[task.user_id]?.displayName ?? "Member")
            : null
        }
        creatorId={task.user_id}
        assignedTo={view === "assignee" ? null : task.assigned_to}
        assigneeName={
          task.assigned_to
            ? (peopleByUserId[task.assigned_to]?.displayName ?? null)
            : null
        }
        currentUserId={currentUserId}
        checklist={progress}
        onClick={() => setEditingTaskId(task.id)}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((message) => (
            <div
              key={message}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
            >
              {message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 space-y-3">
        <FocusSummary tasks={summaryTasks} scopeLabel={summaryScope} />

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div
            className="inline-flex w-fit rounded-lg border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900"
            role="tablist"
            aria-label="Board view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "category"}
              onClick={() => {
                setView("category");
                setFilterId(ALL_FILTER);
              }}
              className={`min-h-8 cursor-pointer rounded-md px-2.5 text-xs font-medium ${
                view === "category"
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              Category
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "assignee"}
              onClick={() => {
                setView("assignee");
                setFilterId(ALL_FILTER);
              }}
              className={`min-h-8 cursor-pointer rounded-md px-2.5 text-xs font-medium ${
                view === "assignee"
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
              }`}
            >
              Assignee
            </button>
          </div>

          {columns.length > 0 ? (
            <div className="min-w-0 sm:w-56">
              <label htmlFor="focus-filter" className={formLabelClassName}>
                Filter
              </label>
              <select
                id="focus-filter"
                value={filterId}
                onChange={(event) => setFilterId(event.target.value)}
                className={`${compactFieldClassName} min-h-9 py-1.5 text-xs`}
              >
                <option value={ALL_FILTER}>
                  {view === "category" ? "All Categories" : "All Assignees"}
                </option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <FocusBoard columns={boardColumns} renderCard={renderCard} />
      </div>

      {editingTask ? (
        <EditTaskModal
          open
          onClose={() => setEditingTaskId(null)}
          id={editingTask.id}
          title={editingTask.title}
          description={editingTask.description}
          dueAt={editingTask.due_at}
          reminderAt={editingTask.reminder_at}
          reminderMode={editingTask.reminder_mode}
          reminderOffsetMinutes={editingTask.reminder_offset_minutes}
          priority={editingTask.priority}
          recurrence={editingTask.recurrence}
          completed={editingTask.completed}
          cancelledAt={editingTask.cancelled_at}
          categoryId={editingTask.category_id}
          categories={categories}
          labels={labels}
          categoryIdsByLabelId={categoryIdsByLabelId}
          labelIds={labelIdsByTaskId[editingTask.id] ?? []}
          subtasks={subtasksByTaskId[editingTask.id] ?? []}
          taskUserId={editingTask.user_id}
          currentUserId={currentUserId}
          assignedTo={editingTask.assigned_to}
          canDelete={canDeleteSharedTask({
            currentUserId,
            isAdmin,
            taskUserId: editingTask.user_id,
            categoryId: editingTask.category_id,
            categoryScope:
              categoryLookup.get(editingTask.category_id ?? "")?.scope ?? null,
          })}
          onSuccess={() => setEditingTaskId(null)}
          onDeleted={() => setEditingTaskId(null)}
        />
      ) : null}
    </div>
  );
}
