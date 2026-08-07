import { LabelAdminPanel } from "@/components/admin/label-admin-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
import type { Category } from "@/lib/categories/types";
import {
  groupCategoryIdsByLabel,
  LABEL_CATEGORY_LINK_FIELDS,
  type LabelCategoryLink,
} from "@/lib/labels/category-links";
import type { Label } from "@/lib/labels/types";
import { adminPageErrorClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLabelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminUser(user.email)) {
    redirect("/dashboard");
  }

  const [
    { data: labels, error },
    { data: categories, error: categoriesError },
    { data: links, error: linksError },
  ] = await Promise.all([
    supabase
      .from("labels")
      .select(
        "id, name, colour, sort_order, active, scope, created_by, created_at, updated_at",
      )
      .eq("scope", "global")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select(
        "id, parent_id, name, colour, icon_name, sort_order, active, created_at, updated_at",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("label_categories").select(LABEL_CATEGORY_LINK_FIELDS),
  ]);

  const pageError =
    error?.message ?? categoriesError?.message ?? linksError?.message ?? null;

  return (
    <>
      <DashboardHeader
        title="Label management"
        description="Global labels and category links"
        email={user.email}
      />
      <div className="flex-1 overflow-auto p-8">
        {pageError ? (
          <div className={adminPageErrorClassName}>
            Could not load label management data: {pageError}
          </div>
        ) : (
          <LabelAdminPanel
            labels={(labels ?? []) as Label[]}
            categories={(categories ?? []) as Category[]}
            categoryIdsByLabelId={groupCategoryIdsByLabel(
              (links ?? []) as LabelCategoryLink[],
            )}
          />
        )}
      </div>
    </>
  );
}
