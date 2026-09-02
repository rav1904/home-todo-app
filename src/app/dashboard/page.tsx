import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardHomeClient } from "@/components/dashboard/dashboard-home-client";
import {
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/lib/auth/user-display";
import { loadAccessibleCategories } from "@/lib/categories/access";
import { createClient } from "@/lib/supabase/server";

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

  const displayName = getUserDisplayName(
    user?.user_metadata,
    user?.email,
    "there",
  );
  const avatarUrl = getUserAvatarUrl(user?.user_metadata);

  return (
    <>
      <DashboardHeader title="Overview" email={user?.email} />
      <div className="flex-1 overflow-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
        <DashboardHomeClient
          displayName={displayName}
          avatarUrl={avatarUrl}
          tasks={tasks ?? []}
          categories={categoriesResult.categories}
          loadError={error?.message ?? categoriesResult.error?.message ?? null}
        />
      </div>
    </>
  );
}
