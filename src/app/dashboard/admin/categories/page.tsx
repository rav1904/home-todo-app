import { CategoryAdminPanel } from "@/components/admin/category-admin-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import { listAppUsers } from "@/lib/admin/users";
import { CATEGORY_SELECT_FIELDS } from "@/lib/categories/access";
import type { Category } from "@/lib/categories/types";
import { adminPageErrorClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminUser(user.email)) {
    redirect("/dashboard");
  }

  const [
    { data: categories, error },
    { data: grants },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(CATEGORY_SELECT_FIELDS)
      .eq("scope", "global")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("user_category_access").select("user_id, category_id"),
  ]);

  let users: Awaited<ReturnType<typeof listAppUsers>> = [];
  try {
    users = await listAppUsers();
  } catch {
    users = [];
  }

  const usersById = new Map(users.map((entry) => [entry.id, entry]));
  const workspaceMembersByCategoryId: Record<
    string,
    { id: string; displayName: string; email: string | null }[]
  > = {};

  for (const grant of grants ?? []) {
    const member = usersById.get(grant.user_id);
    if (!member) {
      continue;
    }
    const list = workspaceMembersByCategoryId[grant.category_id] ?? [];
    list.push({
      id: member.id,
      displayName: member.displayName,
      email: member.email,
    });
    workspaceMembersByCategoryId[grant.category_id] = list;
  }

  for (const categoryId of Object.keys(workspaceMembersByCategoryId)) {
    workspaceMembersByCategoryId[categoryId].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }

  return (
    <>
      <DashboardHeader
        title="Shared workspaces"
        description="Admin-managed global categories (shared workspaces) and subcategories"
        email={user.email}
      />
      <div className="flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {error ? (
          <div className={adminPageErrorClassName}>
            Could not load categories: {error.message}
          </div>
        ) : (
          <CategoryAdminPanel
            categories={(categories ?? []) as Category[]}
            workspaceMembersByCategoryId={workspaceMembersByCategoryId}
          />
        )}
      </div>
    </>
  );
}
