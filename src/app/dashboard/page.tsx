import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";

const stats = [
  { label: "Open tasks", value: "0", hint: "Nothing due yet" },
  { label: "Due today", value: "0", hint: "All clear for now" },
  { label: "Completed", value: "0", hint: "This week" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="A quick look at your household tasks"
        email={user?.email}
      />
      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-3">
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

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Getting started
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Your dashboard is ready. Add tasks, rooms, and recurring
                  chores next.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Ready
              </span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-stone-600">
              <li className="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-3">
                <span className="mt-0.5 text-emerald-600">1</span>
                <span>
                  Connect Supabase and create your first household account.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-3">
                <span className="mt-0.5 text-emerald-600">2</span>
                <span>
                  Add tasks for rooms, groceries, maintenance, and chores.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-3">
                <span className="mt-0.5 text-emerald-600">3</span>
                <span>Track progress from the overview and tasks pages.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
