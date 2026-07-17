import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import {
  countRecentlyJoinedUsers,
  listAppUsers,
  RECENT_JOIN_DAYS,
} from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminUser(user.email)) {
    redirect("/dashboard");
  }

  let usersError: string | null = null;
  let totalUsers = 0;
  let recentlyJoined = 0;
  let users: Awaited<ReturnType<typeof listAppUsers>> = [];

  try {
    users = await listAppUsers();
    totalUsers = users.length;
    recentlyJoined = countRecentlyJoinedUsers(users);
  } catch (error) {
    usersError =
      error instanceof Error
        ? error.message
        : "Could not load users from Supabase Auth.";
  }

  return (
    <>
      <DashboardHeader
        title="Admin Panel"
        description="Workspace user administration"
        email={user.email}
      />
      <div className="flex-1 space-y-8 overflow-auto p-8">
        {usersError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Could not load users: {usersError}
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-stone-500">Total users</p>
                <p className="mt-2 text-3xl font-semibold text-stone-900">
                  {totalUsers}
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  Registered app accounts
                </p>
              </article>
              <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-stone-500">
                  Recently joined
                </p>
                <p className="mt-2 text-3xl font-semibold text-stone-900">
                  {recentlyJoined}
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  Joined in the last {RECENT_JOIN_DAYS} days
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">Users</h2>
              <p className="mt-1 text-sm text-stone-500">
                Read-only list of app users. Task data is not shown here.
              </p>

              {users.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">No users found.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500">
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium">User ID</th>
                        <th className="pb-3 pr-4 font-medium">Created</th>
                        <th className="pb-3 font-medium">Last sign-in</th>
                      </tr>
                    </thead>
                    <tbody className="text-stone-700">
                      {users.map((appUser) => (
                        <tr
                          key={appUser.id}
                          className="border-b border-stone-100 last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-stone-900">
                            {appUser.email ?? "—"}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-stone-500">
                            {appUser.id}
                          </td>
                          <td className="py-3 pr-4">
                            {formatDateTime(appUser.createdAt)}
                          </td>
                          <td className="py-3">
                            {appUser.lastSignInAt
                              ? formatDateTime(appUser.lastSignInAt)
                              : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
