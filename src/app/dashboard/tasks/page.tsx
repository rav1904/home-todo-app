import { AddTaskForm } from "@/components/tasks/add-task-form";
import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";

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

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, completed, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <DashboardHeader
        title="Tasks"
        description="View and manage household to-dos"
        email={user?.email}
      />
      <div className="flex-1 space-y-6 overflow-auto p-8">
        <AddTaskForm />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Could not load tasks: {error.message}
          </div>
        ) : tasks && tasks.length > 0 ? (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`text-base font-semibold text-stone-900 ${
                        task.completed ? "line-through text-stone-400" : ""
                      }`}
                    >
                      {task.title}
                    </h2>
                    {task.description ? (
                      <p className="mt-1 text-sm text-stone-600">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      task.completed
                        ? "bg-stone-100 text-stone-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {task.completed ? "Completed" : "Open"}
                  </span>
                </div>
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
                  <div>
                    <dt className="sr-only">Due</dt>
                    <dd>
                      Due:{" "}
                      {task.due_at ? formatDateTime(task.due_at) : "No due date"}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Created</dt>
                    <dd>Created: {formatDate(task.created_at)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500">
              ☑
            </div>
            <h2 className="mt-4 text-lg font-semibold text-stone-900">
              No tasks yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Use the form above to add your first task.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
