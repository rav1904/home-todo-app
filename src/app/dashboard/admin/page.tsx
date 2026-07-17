import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import {
  countRecentlyJoinedUsers,
  listAppUsersWithTaskCounts,
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

function UserAvatar({
  avatarUrl,
  displayName,
  email,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
}) {
  const fallbackLabel = (displayName ?? email ?? "?").charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-stone-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-sm font-medium text-stone-600">
      {fallbackLabel}
    </div>
  );
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
  let users: Awaited<ReturnType<typeof listAppUsersWithTaskCounts>> = [];

  try {
    users = await listAppUsersWithTaskCounts();
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
                Read-only user list with aggregate task counts. Task content is
                not shown.
              </p>

              {users.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">No users found.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500">
                        <th className="pb-3 pr-4 font-medium">User</th>
                        <th className="pb-3 pr-4 font-medium">Created</th>
                        <th className="pb-3 pr-4 font-medium">Last sign-in</th>
                        <th className="pb-3 pr-4 font-medium">Total tasks</th>
                        <th className="pb-3 pr-4 font-medium">Outstanding</th>
                        <th className="pb-3 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="text-stone-700">
                      {users.map((appUser) => (
                        <tr
                          key={appUser.id}
                          className="border-b border-stone-100 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                avatarUrl={appUser.avatarUrl}
                                displayName={appUser.displayName}
                                email={appUser.email}
                              />
                              <div className="min-w-0">
                                {appUser.displayName ? (
                                  <p className="font-medium text-stone-900">
                                    {appUser.displayName}
                                  </p>
                                ) : null}
                                <p
                                  className={
                                    appUser.displayName
                                      ? "text-xs text-stone-500"
                                      : "font-medium text-stone-900"
                                  }
                                >
                                  {appUser.email ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {formatDateTime(appUser.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            {appUser.lastSignInAt
                              ? formatDateTime(appUser.lastSignInAt)
                              : "Never"}
                          </td>
                          <td className="py-3 pr-4">
                            {appUser.taskCounts.total}
                          </td>
                          <td className="py-3 pr-4">
                            {appUser.taskCounts.outstanding}
                          </td>
                          <td className="py-3">
                            {appUser.taskCounts.completed}
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
