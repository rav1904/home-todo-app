"use client";

import { CategoryBadge } from "@/components/tasks/category-select";
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { AssigneeFilterChips } from "@/components/tasks/assignee-filter-chips";
import { WorkspaceFilterChips } from "@/components/tasks/workspace-filter-chips";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  NULL_CATEGORY_DISPLAY,
} from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import { filterTasksByCategory } from "@/lib/categories/filter";
import type { Label } from "@/lib/labels/types";
import { isTaskOpen } from "@/lib/tasks/cancel";
import {
  collectAssigneeFilterPeople,
  filterTasksByAssignee,
  type TaskAssigneeFilter,
} from "@/lib/tasks/assignee-filter";
import {
  canDeleteSharedTask,
  shouldShowTaskCreator,
  type TaskCreatorProfile,
} from "@/lib/tasks/creators";
import { TaskAttribution } from "@/components/tasks/task-attribution";
import { formatHomeDueDate } from "@/lib/tasks/local-dates";
import type { TaskSubtask } from "@/lib/tasks/subtasks/types";
import {
  filterChipActiveClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type DashboardHomeTask = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  reminder_at: string | null;
  reminder_mode?: string | null;
  reminder_offset_minutes?: number | null;
  priority?: string | null;
  recurrence?: string | null;
  completed: boolean;
  cancelled_at?: string | null;
  created_at: string;
  category_id: string | null;
  user_id: string;
  assigned_to: string | null;
};

type HomeStatusFilter = "open" | "today" | "overdue" | "done";

type DashboardHomeClientProps = {
  displayName: string;
  avatarUrl: string | null;
  tasks: DashboardHomeTask[];
  categories: Category[];
  labels: Label[];
  categoryIdsByLabelId: Record<string, string[]>;
  labelIdsByTaskId: Record<string, string[]>;
  subtasksByTaskId: Record<string, TaskSubtask[]>;
  currentUserId: string;
  isAdmin: boolean;
  peopleByUserId: Record<string, TaskCreatorProfile>;
  initialEditTaskId?: string | null;
  loadError?: string | null;
};

function startOfLocalDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfLocalDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isDueToday(dueAt: string, today = new Date()) {
  const due = new Date(dueAt);
  return due >= startOfLocalDay(today) && due <= endOfLocalDay(today);
}

function isOverdue(dueAt: string, today = new Date()) {
  return new Date(dueAt) < startOfLocalDay(today);
}

function sortOpenTasksForHome(tasks: DashboardHomeTask[], today: Date) {
  return [...tasks].sort((a, b) => {
    const aOverdue = a.due_at && isOverdue(a.due_at, today) ? 0 : 1;
    const bOverdue = b.due_at && isOverdue(b.due_at, today) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const aToday = a.due_at && isDueToday(a.due_at, today) ? 0 : 1;
    const bToday = b.due_at && isDueToday(b.due_at, today) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;

    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function syncEditQuery(pathname: string, editId: string | null) {
  const url = editId
    ? `${pathname}?edit=${encodeURIComponent(editId)}`
    : pathname;
  window.history.replaceState(window.history.state, "", url);
}

function homeDueClass(overdue: boolean, dueToday: boolean) {
  if (overdue) {
    return "font-medium text-rose-700 dark:text-rose-300";
  }
  if (dueToday) {
    return "text-stone-500 dark:text-stone-400";
  }
  return "text-stone-400 dark:text-stone-500";
}

function StatusChip({
  label,
  value,
  selected,
  onSelect,
  emphasize,
}: {
  label: string;
  value: number;
  selected: boolean;
  onSelect: () => void;
  emphasize?: "danger" | "warning";
}) {
  const valueClass =
    emphasize === "danger" && value > 0
      ? "text-rose-700 dark:text-rose-300"
      : emphasize === "warning" && value > 0
        ? "text-amber-800 dark:text-amber-300"
        : selected
          ? "text-white"
          : "text-stone-800 dark:text-stone-100";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
        selected ? filterChipActiveClassName : filterChipIdleClassName
      }`}
    >
      <span className={selected ? "text-white/80" : "text-stone-500 dark:text-stone-400"}>
        {label}
      </span>
      <span className={`tabular-nums font-semibold ${valueClass}`}>{value}</span>
    </button>
  );
}

export function DashboardHomeClient({
  displayName,
  avatarUrl,
  tasks,
  categories,
  labels,
  categoryIdsByLabelId,
  labelIdsByTaskId,
  subtasksByTaskId,
  currentUserId,
  isAdmin,
  peopleByUserId,
  initialEditTaskId = null,
  loadError = null,
}: DashboardHomeClientProps) {
  const pathname = usePathname();
  const today = useMemo(() => new Date(), []);
  const [workspaceId, setWorkspaceId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("open");
  const [assigneeFilter, setAssigneeFilter] = useState<TaskAssigneeFilter>({
    type: "all",
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(
    initialEditTaskId,
  );

  const categoryLookup = useMemo(
    () => buildCategoryLookup(categories),
    [categories],
  );
  const { subsByParent } = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const tasksById = useMemo(() => {
    const map = new Map<string, DashboardHomeTask>();
    for (const task of tasks) {
      map.set(task.id, task);
    }
    return map;
  }, [tasks]);

  const editingTask = editingTaskId
    ? (tasksById.get(editingTaskId) ?? null)
    : null;

  useEffect(() => {
    if (initialEditTaskId && tasksById.has(initialEditTaskId)) {
      setEditingTaskId(initialEditTaskId);
    }
  }, [initialEditTaskId, tasksById]);

  useEffect(() => {
    syncEditQuery(pathname, editingTaskId);
  }, [pathname, editingTaskId]);

  function openTask(taskId: string) {
    setEditingTaskId(taskId);
  }

  function closeEdit() {
    setEditingTaskId(null);
  }

  const openTasks = useMemo(
    () => tasks.filter((task) => isTaskOpen(task)),
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed),
    [tasks],
  );
  const dueTodayCount = useMemo(
    () =>
      openTasks.filter((task) => task.due_at && isDueToday(task.due_at, today))
        .length,
    [openTasks, today],
  );
  const overdueCount = useMemo(
    () =>
      openTasks.filter((task) => task.due_at && isOverdue(task.due_at, today))
        .length,
    [openTasks, today],
  );

  const filteredTasks = useMemo(() => {
    const byWorkspace = filterTasksByCategory(
      tasks,
      workspaceId === "all"
        ? { type: "all" }
        : { type: "main", mainCategoryId: workspaceId },
      subsByParent,
    );

    let next = byWorkspace;
    switch (statusFilter) {
      case "open":
        next = byWorkspace.filter((task) => isTaskOpen(task));
        break;
      case "today":
        next = byWorkspace.filter(
          (task) =>
            isTaskOpen(task) && task.due_at && isDueToday(task.due_at, today),
        );
        break;
      case "overdue":
        next = byWorkspace.filter(
          (task) =>
            isTaskOpen(task) && task.due_at && isOverdue(task.due_at, today),
        );
        break;
      case "done":
        next = byWorkspace.filter((task) => task.completed);
        break;
    }

    if (statusFilter === "done") {
      next = [...next].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      next = sortOpenTasksForHome(next, today);
    }

    return filterTasksByAssignee(next, assigneeFilter, currentUserId);
  }, [tasks, workspaceId, statusFilter, assigneeFilter, subsByParent, today, currentUserId]);

  const assigneePeople = useMemo(
    () => collectAssigneeFilterPeople(tasks, peopleByUserId, currentUserId),
    [tasks, peopleByUserId, currentUserId],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 overflow-x-hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Hi {displayName}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {overdueCount > 0 || dueTodayCount > 0
              ? "A few things need attention"
              : "Your tasks"}
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm break-words text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          Could not load dashboard data: {loadError}
        </div>
      ) : null}

      <div className="min-w-0 space-y-2">
        <div className="flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StatusChip
            label="Open"
            value={openTasks.length}
            selected={statusFilter === "open"}
            onSelect={() => setStatusFilter("open")}
          />
          <StatusChip
            label="Today"
            value={dueTodayCount}
            selected={statusFilter === "today"}
            onSelect={() => setStatusFilter("today")}
            emphasize="warning"
          />
          <StatusChip
            label="Overdue"
            value={overdueCount}
            selected={statusFilter === "overdue"}
            onSelect={() => setStatusFilter("overdue")}
            emphasize="danger"
          />
          <StatusChip
            label="Done"
            value={completedTasks.length}
            selected={statusFilter === "done"}
            onSelect={() => setStatusFilter("done")}
          />
        </div>

        {categories.length > 0 ? (
          <WorkspaceFilterChips
            categories={categories}
            activeId={workspaceId}
            onSelect={setWorkspaceId}
          />
        ) : null}

        <AssigneeFilterChips
          active={assigneeFilter}
          currentUserId={currentUserId}
          people={assigneePeople}
          onSelect={setAssigneeFilter}
        />
      </div>

      <section className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Tasks
          </h2>
          <Link
            href="/dashboard/tasks"
            className="text-xs font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400"
          >
            View all
          </Link>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="py-6 text-sm text-stone-500 dark:text-stone-400">
            No matching tasks.
          </p>
        ) : (
          <ul className="min-w-0 divide-y divide-stone-100 dark:divide-stone-800">
            {filteredTasks.slice(0, 40).map((task) => {
              const overdue = Boolean(
                task.due_at &&
                  !task.completed &&
                  !task.cancelled_at &&
                  isOverdue(task.due_at, today),
              );
              const dueToday = Boolean(
                task.due_at &&
                  !task.completed &&
                  !task.cancelled_at &&
                  isDueToday(task.due_at, today),
              );
              const category = getCategoryDisplay(
                task.category_id,
                categoryLookup,
              );
              const categoryUnavailable =
                task.category_id !== null && category === null;
              const workspaceDisplay =
                category ??
                (categoryUnavailable ? null : NULL_CATEGORY_DISPLAY);

              const showAuthor = shouldShowTaskCreator({
                taskUserId: task.user_id,
                currentUserId,
                categoryId: task.category_id,
                categoryScope:
                  categoryLookup.get(task.category_id ?? "")?.scope ?? null,
              });
              const hasPeople = showAuthor || Boolean(task.assigned_to);
              const dueClass = homeDueClass(overdue, dueToday);
              const dueLabel = task.due_at
                ? formatHomeDueDate(task.due_at)
                : null;

              return (
                <li key={task.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="grid w-full min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 gap-y-0.5 overflow-hidden py-2.5 text-left transition hover:bg-stone-50/80 sm:grid-cols-[6.5rem_minmax(0,1fr)_4.75rem] dark:hover:bg-stone-800/40"
                  >
                    <span className="min-w-0 max-w-[6.5rem] self-center sm:col-start-1 sm:row-start-1 sm:max-w-none sm:self-start sm:pt-0.5">
                      <CategoryBadge
                        category={workspaceDisplay}
                        unavailable={categoryUnavailable}
                        compact
                        muted
                      />
                    </span>
                    {dueLabel ? (
                      <span
                        className={`justify-self-end self-center whitespace-nowrap text-[11px] tabular-nums sm:col-start-3 sm:row-start-1 sm:self-start sm:pt-0.5 sm:w-full sm:text-right sm:text-xs ${dueClass}`}
                      >
                        {dueLabel}
                      </span>
                    ) : (
                      <span className="hidden sm:col-start-3 sm:row-start-1 sm:block" />
                    )}
                    <p
                      className={`col-span-2 min-w-0 line-clamp-2 text-[15px] font-medium leading-snug break-words [overflow-wrap:anywhere] text-stone-900 dark:text-stone-100 sm:col-span-1 sm:col-start-2 sm:row-start-1 ${
                        task.completed
                          ? "text-stone-400 line-through dark:text-stone-500"
                          : ""
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </p>
                    {hasPeople ? (
                      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-2">
                        <TaskAttribution
                          showAuthor={showAuthor}
                          authorName={
                            showAuthor
                              ? (peopleByUserId[task.user_id]?.displayName ??
                                "Member")
                              : null
                          }
                          creatorId={task.user_id}
                          assigneeId={task.assigned_to}
                          assigneeName={
                            task.assigned_to
                              ? (peopleByUserId[task.assigned_to]
                                  ?.displayName ?? null)
                              : null
                          }
                          currentUserId={currentUserId}
                        />
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {editingTask ? (
        <EditTaskModal
          open
          onClose={closeEdit}
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
          onSuccess={closeEdit}
          onDeleted={closeEdit}
        />
      ) : null}
    </div>
  );
}
