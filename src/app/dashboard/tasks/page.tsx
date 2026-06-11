import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <DashboardHeader
        title="Tasks"
        description="View and manage household to-dos"
        email={user?.email}
      />
      <div className="flex-1 overflow-auto p-8">
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl text-stone-500">
            ☑
          </div>
          <h2 className="mt-4 text-lg font-semibold text-stone-900">
            No tasks yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            This is where your household tasks will live. You can add task
            lists, due dates, and assignments in the next step.
          </p>
          <button
            type="button"
            disabled
            className="mt-6 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white opacity-60"
          >
            Add task (coming soon)
          </button>
        </div>
      </div>
    </>
  );
}
