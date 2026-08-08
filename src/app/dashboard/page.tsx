import { DashboardHeader } from "@/components/dashboard/header";
import {
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/lib/auth/user-display";
import {
  formatReminderDateTime,
  partitionActiveReminders,
} from "@/lib/tasks/reminder";
import { createClient } from "@/lib/supabase/server";
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TaskList({
  tasks,
  emptyMessage,
  emptyAction,
  showDueDate = false,
  showReminder = false,
  reminderOverdue = false,
}: {
  tasks: Task[];
  emptyMessage: string;
  emptyAction?: ReactNode;
  showDueDate?: boolean;
  showReminder?: boolean;
  reminderOverdue?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="py-1">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {emptyMessage}
        </p>
        {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {tasks.map((task) => {
        const meta = showReminder
          ? task.reminder_at
            ? formatReminderDateTime(task.reminder_at)
            : null
          : showDueDate && task.due_at
            ? formatDateTime(task.due_at)
            : formatDate(task.created_at);

        return (
          <li key={task.id}>
            <Link
              href={`/dashboard/tasks?edit=${task.id}`}
              className="flex items-start justify-between gap-3 py-2.5 transition hover:bg-stone-50/80 dark:hover:bg-stone-800/40"
            >
              <div className="min-w-0 px-1">
                <p
                  className={`text-sm font-medium text-stone-900 dark:text-stone-100 ${
                    task.completed
                      ? "text-stone-400 line-through dark:text-stone-500"
                      : ""
                  }`}
                >
                  {task.title}
                </p>
                {task.description ? (
                  <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                    {task.description}
                  </p>
                ) : null}
              </div>
              {meta ? (
                <span
                  className={`shrink-0 pt-0.5 text-xs tabular-nums ${
                    showReminder && reminderOverdue
                      ? "font-medium text-rose-700 dark:text-rose-300"
                      : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {meta}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function OverviewPanel({
  title,
  description,
  count,
  children,
  href,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
  href?: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200/80 bg-white p-4 sm:p-5 dark:border-stone-700/80 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <Link
              href={href}
              className="text-base font-semibold text-stone-900 transition hover:text-emerald-700 dark:text-stone-100 dark:hover:text-emerald-300"
            >
              {title}
            </Link>
          ) : (
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {title}
            </h2>
          )}
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {count}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
  emphasize,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  emphasize?: "danger" | "warning";
}) {
  const valueClass =
    emphasize === "danger" && value > 0
      ? "text-rose-700 dark:text-rose-300"
      : emphasize === "warning" && value > 0
        ? "text-amber-800 dark:text-amber-300"
        : "text-stone-900 dark:text-stone-100";

  return (
    <Link
      href={href}
      className="rounded-xl border border-stone-200/80 bg-white p-4 transition hover:border-stone-300 hover:bg-stone-50/80 dark:border-stone-700/80 dark:bg-stone-900 dark:hover:border-stone-600 dark:hover:bg-stone-800/60"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{hint}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, reminder_at, completed, created_at")
    .order("created_at", { ascending: false });

  const allTasks = (tasks ?? []) as Task[];
  const today = new Date();
  const now = new Date();

  const openTasks = allTasks.filter((task) => !task.completed);
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
  const recentlyAddedTasks = allTasks.slice(0, 5);

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

  const focusLink = (
    <Link
      href="/dashboard/focus"
      className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
    >
      Open Focus
    </Link>
  );

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
      <DashboardHeader
        title={`Hello ${displayName}, what would you like to do today?`}
        description={
          needsAttention
            ? "A few things need attention today"
            : "A calm look at your workspace"
        }
        email={user?.email}
        avatarUrl={avatarUrl}
        avatarName={displayName}
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              Could not load dashboard data: {error.message}
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open"
              value={openTasks.length}
              hint={
                openTasks.length === 0 ? "All caught up" : "Still to do"
              }
              href="/dashboard/tasks?status=open"
            />
            <StatCard
              label="Due today"
              value={dueTodayTasks.length}
              hint={
                dueTodayTasks.length === 0
                  ? "Nothing due today"
                  : "Due by end of day"
              }
              href="/dashboard/focus"
              emphasize="warning"
            />
            <StatCard
              label="Overdue"
              value={overdueTasks.length}
              hint={
                overdueTasks.length === 0 ? "None overdue" : "Needs attention"
              }
              href="/dashboard/focus"
              emphasize="danger"
            />
            <StatCard
              label="Completed"
              value={completedTasks.length}
              hint="Marked done"
              href="/dashboard/tasks?status=completed"
            />
          </section>

          {needsAttention ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Focus has items that need attention now.
              </p>
              {focusLink}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <OverviewPanel
              title="Reminders due"
              description="Reminder time has passed"
              count={remindersDueOrOverdue.length}
              href="/dashboard/focus"
            >
              <TaskList
                tasks={remindersDueOrOverdue}
                emptyMessage="No reminders due right now."
                emptyAction={focusLink}
                showReminder
                reminderOverdue
              />
            </OverviewPanel>

            <OverviewPanel
              title="Upcoming reminders"
              description="Reminders still ahead"
              count={upcomingReminders.length}
            >
              <TaskList
                tasks={upcomingReminders}
                emptyMessage="No upcoming reminders."
                showReminder
              />
            </OverviewPanel>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <OverviewPanel
              title="Due today"
              description="By end of today"
              count={dueTodayTasks.length}
              href="/dashboard/focus"
            >
              <TaskList
                tasks={dueTodayTasks}
                emptyMessage="Nothing due today."
                emptyAction={focusLink}
                showDueDate
              />
            </OverviewPanel>

            <OverviewPanel
              title="This week"
              description="Next 7 days after today"
              count={dueWithinWeekTasks.length}
              href="/dashboard/calendar"
            >
              <TaskList
                tasks={dueWithinWeekTasks}
                emptyMessage="Nothing else due this week."
                showDueDate
              />
            </OverviewPanel>

            <OverviewPanel
              title="Later"
              description="Due after the next week"
              count={upcomingTasks.length}
              href="/dashboard/calendar"
            >
              <TaskList
                tasks={upcomingTasks}
                emptyMessage="No later tasks scheduled."
                showDueDate
              />
            </OverviewPanel>
          </section>

          <OverviewPanel
            title="Recently added"
            description="Newest first"
            count={recentlyAddedTasks.length}
            href="/dashboard/tasks"
          >
            <TaskList
              tasks={recentlyAddedTasks}
              emptyMessage="No tasks yet."
              emptyAction={tasksLink}
            />
          </OverviewPanel>
        </div>
      </div>
    </>
  );
}
