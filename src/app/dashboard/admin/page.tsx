import { UserCategoryAccessPanel } from "@/components/admin/user-category-access-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import {
  countRecentlyJoinedUsers,
  listAppUsers,
  RECENT_JOIN_DAYS,
} from "@/lib/admin/users";
import { CATEGORY_SELECT_FIELDS } from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import { cardClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const [
    { data: globalMains, error: categoriesError },
    { data: grants, error: grantsError },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_SELECT_FIELDS)
      .eq("scope", "global")
      .is("parent_id", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("user_category_access").select("user_id, category_id"),
  ]);

  const accessError =
    categoriesError?.message ?? grantsError?.message ?? null;

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
                Grant global top-level categories per user. Personal is private
                and automatic. Task content is never shown here.
              </p>

              {accessError ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  Could not load category access data: {accessError}. Apply{" "}
                  <code className="text-xs">sql/categories_personal_and_access.sql</code>{" "}
                  if you have not already.
                </div>
              ) : null}

              {users.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
                  No users found.
                </p>
              ) : (
                <UserCategoryAccessPanel
                  users={users}
                  globalTopLevelCategories={(globalMains ?? []) as Category[]}
                  grants={(grants ?? []) as { user_id: string; category_id: string }[]}
                  adminUserId={user.id}
                />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
