import { DashboardHeader } from "@/components/dashboard/header";
import { isAdminUser } from "@/lib/admin";
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

  return (
    <>
      <DashboardHeader
        title="Admin Panel"
        description="Workspace administration"
        email={user.email}
      />
      <div className="flex-1 overflow-auto p-8">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-stone-600">
            Signed in as{" "}
            <span className="font-medium text-stone-900">{user.email}</span>
          </p>
          <p className="mt-4 text-sm text-stone-500">
            Admin tools will be added here.
          </p>
        </div>
      </div>
    </>
  );
}
