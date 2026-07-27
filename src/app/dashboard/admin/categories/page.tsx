import { CategoryAdminPanel } from "@/components/admin/category-admin-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import type { Category } from "@/lib/categories/types";
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

  const { data: categories, error } = await supabase
    .from("categories")
    .select(
      "id, parent_id, name, colour, icon_name, sort_order, active, created_at, updated_at",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <DashboardHeader
        title="Category management"
        description="Admin-managed categories and subcategories"
        email={user.email}
      />
      <div className="flex-1 overflow-auto p-8">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Could not load categories: {error.message}
          </div>
        ) : (
          <CategoryAdminPanel categories={(categories ?? []) as Category[]} />
        )}
      </div>
    </>
  );
}
