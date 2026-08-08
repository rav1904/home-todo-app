import { DashboardHeader } from "@/components/dashboard/header";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isAdminUser } from "@/lib/admin";
import {
  countRecentlyJoinedUsers,
  listAppUsers,
  RECENT_JOIN_DAYS,
} from "@/lib/admin/users";
import { cardClassName } from "@/lib/ui/field-classes";
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
      <div className="flex-1 space-y-8 overflow-auto p-4 sm:p-6 lg:p-8">
        {usersError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load users: {usersError}
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <article className={`${cardClassName} p-5`}>
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  Total users
                </p>
                <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
                  {totalUsers}
                </p>
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                  Registered app accounts
                </p>
              </article>
              <article className={`${cardClassName} p-5`}>
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  Recently joined
                </p>
                <p className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
                  {recentlyJoined}
                </p>
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                  Joined in the last {RECENT_JOIN_DAYS} days
                </p>
              </article>
            </section>

            <section className={`${cardClassName} p-6`}>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Users
              </h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Read-only list of app users. Task data is not shown here.
              </p>

              {users.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
                  No users found.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium">User ID</th>
                        <th className="pb-3 pr-4 font-medium">Created</th>
                        <th className="pb-3 font-medium">Last sign-in</th>
                      </tr>
                    </thead>
                    <tbody className="text-stone-700 dark:text-stone-300">
                      {users.map((appUser) => (
                        <tr
                          key={appUser.id}
                          className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <UserAvatar
                                name={appUser.displayName}
                                avatarUrl={appUser.avatarUrl}
                                size="sm"
                              />
                              <span className="truncate font-medium text-stone-900 dark:text-stone-100">
                                {appUser.displayName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-medium text-stone-900 dark:text-stone-100">
                            {appUser.email ?? "—"}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-stone-500 dark:text-stone-400">
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
