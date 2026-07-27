import { CategoryBadge } from "@/components/tasks/category-badge";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  buildCategoryLookup,
  getCategoryDisplay,
} from "@/lib/categories/tree";
import type { Category } from "@/lib/categories/types";
import { createClient } from "@/lib/supabase/server";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
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
  showDueDate = false,
  showCategory = false,
  categoryLookup,
}: {
  tasks: Task[];
  emptyMessage: string;
  showDueDate?: boolean;
  showCategory?: boolean;
  categoryLookup?: Map<string, Category>;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-stone-500">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const category =
          showCategory && categoryLookup
            ? getCategoryDisplay(task.category_id, categoryLookup)
            : null;
        const categoryUnavailable =
          showCategory &&
          task.category_id !== null &&
          category === null;

        return (
          <li
            key={task.id}
            className="flex items-start justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {showCategory && (category || categoryUnavailable) ? (
                  <CategoryBadge
                    category={category}
                    unavailable={categoryUnavailable}
                  />
                ) : null}
                <p
                  className={`text-sm font-medium text-stone-900 ${
                    task.completed ? "line-through text-stone-400" : ""
                  }`}
                >
                  {task.title}
                </p>
              </div>
              {task.description ? (
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {task.description}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-stone-400">
              {showDueDate && task.due_at
                ? formatDateTime(task.due_at)
                : formatDate(task.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tasks, error }, { data: categories }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, description, due_at, completed, created_at, category_id",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select(
        "id, parent_id, name, colour, icon_name, sort_order, active, created_at, updated_at",
      )
      .eq("active", true),
  ]);

  const categoryLookup = buildCategoryLookup((categories ?? []) as Category[]);

  const allTasks = (tasks ?? []) as Task[];
  const today = new Date();

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

  const stats = [
    {
      label: "Open tasks",
      value: openTasks.length,
      hint: openTasks.length === 0 ? "All caught up" : "Still to do",
    },
    {
      label: "Due today",
      value: dueTodayTasks.length,
      hint:
        dueTodayTasks.length === 0 ? "Nothing due today" : "Due by end of day",
    },
    {
      label: "Overdue",
      value: overdueTasks.length,
      hint: overdueTasks.length === 0 ? "None overdue" : "Needs attention",
    },
    {
      label: "Completed",
      value: completedTasks.length,
      hint: "Marked done",
    },
  ];

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="A quick look at your tasks"
        email={user?.email}
      />
      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-8">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              Could not load dashboard data: {error.message}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-stone-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-stone-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-stone-400">{stat.hint}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">Due today</h2>
              <p className="mt-1 text-sm text-stone-500">
                Open tasks due by end of today
              </p>
              <div className="mt-4">
                <TaskList
                  tasks={dueTodayTasks}
                  emptyMessage="No tasks due today."
                  showDueDate
                />
              </div>
            </article>

            <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Due within a week
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Open tasks due in the next 7 days after today
              </p>
              <div className="mt-4">
                <TaskList
                  tasks={dueWithinWeekTasks}
                  emptyMessage="Nothing due in the next week."
                  showDueDate
                />
              </div>
            </article>

            <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">
                Upcoming tasks
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Open tasks due after the next 7 days
              </p>
              <div className="mt-4">
                <TaskList
                  tasks={upcomingTasks}
                  emptyMessage="No upcoming tasks scheduled."
                  showDueDate
                />
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">
              Recently added
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Your latest tasks, newest first
            </p>
            <div className="mt-4">
              <TaskList
                tasks={recentlyAddedTasks}
                emptyMessage="No tasks yet. Add one from the Tasks page."
                showCategory
                categoryLookup={categoryLookup}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
