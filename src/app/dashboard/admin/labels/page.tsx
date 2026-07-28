import { LabelAdminPanel } from "@/components/admin/label-admin-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
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

  const { data: labels, error } = await supabase
    .from("labels")
    .select("id, name, colour, sort_order, active, scope, created_by, created_at, updated_at")
    .eq("scope", "global")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <DashboardHeader
        title="Label management"
        description="Global labels visible to all users"
        email={user.email}
      />
      <div className="flex-1 overflow-auto p-8">
        {error ? (
          <div className={adminPageErrorClassName}>
            Could not load labels: {error.message}
          </div>
        ) : (
          <LabelAdminPanel labels={(labels ?? []) as Label[]} />
        )}
      </div>
    </>
  );
}
