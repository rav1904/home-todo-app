import { DashboardHeader } from "@/components/dashboard/header";
import { CategoryBadge } from "@/components/tasks/category-select";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/lib/auth/user-display";
import { loadAccessibleCategories } from "@/lib/categories/access";
import { NULL_CATEGORY_DISPLAY, formatCategoryNameForDisplay } from "@/lib/categories/display";
import { CategoryIcon } from "@/lib/categories/icons";
import {
  buildCategoryLookup,
  buildCategoryTree,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import {
  formatReminderDateTime,
  partitionActiveReminders,
} from "@/lib/tasks/reminder";
import { isoHasExplicitTime } from "@/lib/tasks/due-datetime";
import { createClient } from "@/lib/supabase/server";
import {
  densePanelClassName,
  filterChipActiveClassName,
  filterChipClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import Link from "next/link";
import type { ReactNode } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  reminder_at: string | null;
  completed: boolean;
  created_at: string;
  category_id: string | null;
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

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function endOfWeekAhead(today = new Date()) {
  return endOfLocalDay(addDays(today, 7));
}

function isDueToday(dueAt: string, today = new Date()) {
  const due = new Date(dueAt);
  return due >= startOfLocalDay(today) && due <= endOfLocalDay(today);
}

function isOverdue(dueAt: string, today = new Date()) {
  return new Date(dueAt) < startOfLocalDay(today);
}

function isDueWithinWeek(dueAt: string, today = new Date()) {
  const due = new Date(dueAt);
  return due > endOfLocalDay(today) && due <= endOfWeekAhead(today);
}

function isUpcoming(dueAt: string, today = new Date()) {
  return new Date(dueAt) > endOfWeekAhead(today);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!isoHasExplicitTime(value)) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortOpenTasksForHome(tasks: Task[], today: Date) {
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

function SummaryChip({
  label,
  value,
  href,
  emphasize,
}: {
  label: string;
  value: number;
  href: string;
  emphasize?: "danger" | "warning";
}) {
  const valueClass =
    emphasize === "danger" && value > 0
      ? "text-rose-700 dark:text-rose-300"
      : emphasize === "warning" && value > 0
        ? "text-amber-800 dark:text-amber-300"
        : "text-stone-800 dark:text-stone-100";

  return (
    <Link
      href={href}
      className={`${filterChipClassName} ${filterChipIdleClassName} gap-1.5 !rounded-lg px-2.5 py-1.5`}
    >
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span className={`tabular-nums font-semibold ${valueClass}`}>{value}</span>
    </Link>
  );
}

function CompactTaskList({
  tasks,
  categoryLookup,
  emptyMessage,
  emptyAction,
}: {
  tasks: Task[];
  categoryLookup: ReturnType<typeof buildCategoryLookup>;
  emptyMessage: string;
  emptyAction?: ReactNode;
}) {
  if (tasks.length === 0) {
    return (
      <div className="py-2">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {emptyMessage}
        </p>
        {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
      </div>
    );
  }

  const today = new Date();

  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {tasks.map((task) => {
        const overdue = Boolean(
          task.due_at && !task.completed && isOverdue(task.due_at, today),
        );
        const dueToday = Boolean(
          task.due_at && !task.completed && isDueToday(task.due_at, today),
        );
        const category = getCategoryDisplay(task.category_id, categoryLookup);
        const categoryUnavailable =
          task.category_id !== null && category === null;
        const workspaceDisplay =
          category ?? (categoryUnavailable ? null : NULL_CATEGORY_DISPLAY);

        return (
          <li key={task.id} className="min-w-0">
            <Link
              href={`/dashboard/tasks?edit=${task.id}`}
              className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 py-2 transition hover:bg-stone-50/80 dark:hover:bg-stone-800/40"
            >
              <CategoryBadge
                category={workspaceDisplay}
                unavailable={categoryUnavailable}
                compact
              />
              <div className="min-w-0 flex-1 basis-[8rem]">
                <p
                  className={`line-clamp-3 text-sm font-medium leading-snug break-words [overflow-wrap:anywhere] text-stone-900 dark:text-stone-100 ${
                    task.completed
                      ? "text-stone-400 line-through dark:text-stone-500"
                      : ""
                  }`}
                  title={task.title}
                >
                  {task.title}
                </p>
              </div>
              {task.due_at ? (
                <span
                  className={`shrink-0 pt-0.5 text-[11px] tabular-nums ${
                    overdue
                      ? "font-medium text-rose-700 dark:text-rose-300"
                      : dueToday
                        ? "font-medium text-amber-800 dark:text-amber-300"
                        : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {formatDateTime(task.due_at)}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MiniPanel({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number;
  href?: string;
  children: ReactNode;
}) {
  return (
    <article className={`${densePanelClassName} p-3`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {href ? (
          <Link
            href={href}
            className="text-xs font-semibold tracking-wide text-stone-500 uppercase transition hover:text-emerald-700 dark:text-stone-400 dark:hover:text-emerald-300"
          >
            {title}
          </Link>
        ) : (
          <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
            {title}
          </h2>
        )}
        <span className="text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
          {count}
        </span>
      </div>
      {children}
    </article>
  );
}

function MiniLinkList({
  tasks,
  showReminder,
  reminderOverdue,
}: {
  tasks: Task[];
  showReminder?: boolean;
  reminderOverdue?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-xs text-stone-400 dark:text-stone-500">None</p>
    );
  }

  return (
    <ul className="space-y-1">
      {tasks.slice(0, 4).map((task) => (
        <li key={task.id}>
          <Link
            href={`/dashboard/tasks?edit=${task.id}`}
            className="flex items-center justify-between gap-2 text-xs transition hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <span className="min-w-0 truncate text-stone-700 dark:text-stone-300">
              {task.title}
            </span>
            {showReminder && task.reminder_at ? (
              <span
                className={`shrink-0 tabular-nums ${
                  reminderOverdue
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-stone-400"
                }`}
              >
                {formatReminderDateTime(task.reminder_at)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tasks, error }, categoriesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, due_at, reminder_at, completed, created_at, category_id",
      )
      .order("created_at", { ascending: false }),
    loadAccessibleCategories(supabase),
  ]);

  const allTasks = (tasks ?? []) as Task[];
  const today = new Date();
  const now = new Date();
  const { mains } = buildCategoryTree(categoriesResult.categories);
  const categoryLookup = buildCategoryLookup(categoriesResult.categories);

  const openTasks = allTasks.filter((task) => !task.completed);
  const homeTasks = sortOpenTasksForHome(openTasks, today).slice(0, 20);
  const dueTodayTasks = openTasks
    .filter((task) => task.due_at && isDueToday(task.due_at, today))
    .sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime(),
    );
  const dueWithinWeekTasks = openTasks
    .filter((task) => task.due_at && isDueWithinWeek(task.due_at, today))
    .sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime(),
    );
  const overdueTasks = openTasks.filter(
    (task) => task.due_at && isOverdue(task.due_at, today),
  );
  const completedTasks = allTasks.filter((task) => task.completed);
  const upcomingTasks = openTasks
    .filter((task) => task.due_at && isUpcoming(task.due_at, today))
    .sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime(),
    )
    .slice(0, 5);

  const { dueOrOverdue: remindersDueOrOverdue, upcoming: upcomingReminders } =
    partitionActiveReminders(allTasks, now);

  const needsAttention =
    overdueTasks.length +
      dueTodayTasks.length +
      remindersDueOrOverdue.length >
    0;

  const displayName = getUserDisplayName(
    user?.user_metadata,
    user?.email,
    "there",
  );
  const avatarUrl = getUserAvatarUrl(user?.user_metadata);

  const tasksLink = (
    <Link
      href="/dashboard/tasks"
      className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
    >
      Go to Tasks
    </Link>
  );

  return (
    <>
      <DashboardHeader title="Overview" email={user?.email} />
      <div className="flex-1 overflow-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={displayName} avatarUrl={avatarUrl} size="sm" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Hi {displayName}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {needsAttention
                  ? "A few things need attention"
                  : "Your open tasks"}
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              Could not load dashboard data: {error.message}
            </div>
          ) : null}

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SummaryChip
              label="Open"
              value={openTasks.length}
              href="/dashboard/tasks?status=open"
            />
            <SummaryChip
              label="Today"
              value={dueTodayTasks.length}
              href="/dashboard/focus"
              emphasize="warning"
            />
            <SummaryChip
              label="Overdue"
              value={overdueTasks.length}
              href="/dashboard/focus"
              emphasize="danger"
            />
            <SummaryChip
              label="Done"
              value={completedTasks.length}
              href="/dashboard/tasks?status=completed"
            />
          </div>

          {mains.length > 0 ? (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href="/dashboard/tasks"
                className={`${filterChipClassName} ${filterChipActiveClassName}`}
              >
                All
              </Link>
              {mains.map((main) => (
                <Link
                  key={main.id}
                  href={`/dashboard/tasks?category=${main.id}`}
                  className={`${filterChipClassName} ${filterChipIdleClassName}`}
                  title={main.admin_note ?? formatCategoryNameForDisplay(main.name)}
                >
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `${main.colour}22`,
                      color: main.colour,
                    }}
                  >
                    <CategoryIcon
                      iconName={main.icon_name}
                      className="h-2.5 w-2.5"
                    />
                  </span>
                  {formatCategoryNameForDisplay(main.name)}
                </Link>
              ))}
            </div>
          ) : null}

          <section className={`${densePanelClassName} p-3`}>
            <div className="mb-2 flex items-center justify-between gap-2">
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
            <CompactTaskList
              tasks={homeTasks}
              categoryLookup={categoryLookup}
              emptyMessage="No open tasks. Nice work."
              emptyAction={tasksLink}
            />
          </section>

          {needsAttention ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-xs text-amber-900 dark:text-amber-200">
                Focus has items that need attention.
              </p>
              <Link
                href="/dashboard/focus"
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
              >
                Open Focus
              </Link>
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2">
            <MiniPanel
              title="Reminders due"
              count={remindersDueOrOverdue.length}
              href="/dashboard/focus"
            >
              <MiniLinkList
                tasks={remindersDueOrOverdue}
                showReminder
                reminderOverdue
              />
            </MiniPanel>
            <MiniPanel
              title="Upcoming reminders"
              count={upcomingReminders.length}
            >
              <MiniLinkList tasks={upcomingReminders} showReminder />
            </MiniPanel>
            <MiniPanel
              title="This week"
              count={dueWithinWeekTasks.length}
              href="/dashboard/calendar"
            >
              <MiniLinkList tasks={dueWithinWeekTasks} />
            </MiniPanel>
            <MiniPanel
              title="Later"
              count={upcomingTasks.length}
              href="/dashboard/calendar"
            >
              <MiniLinkList tasks={upcomingTasks} />
            </MiniPanel>
          </section>
        </div>
      </div>
    </>
  );
}
