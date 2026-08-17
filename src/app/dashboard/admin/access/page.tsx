import { AccessControlPanel } from "@/components/admin/access-control-panel";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  listAllowedUsersByStatus,
  listPendingAccessRequests,
} from "@/lib/access/queries";
import { isAdminUser } from "@/lib/admin";
import { cardClassName } from "@/lib/ui/field-classes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAdminUser(user.email)) {
    redirect("/dashboard");
  }

  let loadError: string | null = null;
  let pendingRequests: Awaited<ReturnType<typeof listPendingAccessRequests>> =
    [];
  let approvedUsers: Awaited<ReturnType<typeof listAllowedUsersByStatus>> = [];
  let revokedUsers: Awaited<ReturnType<typeof listAllowedUsersByStatus>> = [];

  try {
    [pendingRequests, approvedUsers, revokedUsers] = await Promise.all([
      listPendingAccessRequests(),
      listAllowedUsersByStatus("approved"),
      listAllowedUsersByStatus("revoked"),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load access control data.";
  }

  return (
    <>
      <DashboardHeader
        title="Access"
        description="Approve requests and manage who can use the app"
        email={user.email}
      />
      <div className="flex-1 space-y-6 overflow-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Could not load access data: {loadError}. Apply{" "}
            <code className="text-xs">sql/app_access_control.sql</code> if you
            have not already.
          </div>
        ) : (
          <section className={`${cardClassName} p-6`}>
            <AccessControlPanel
              pendingRequests={pendingRequests}
              approvedUsers={approvedUsers}
              revokedUsers={revokedUsers}
              adminEmail={user.email}
            />
          </section>
        )}
      </div>
    </>
  );
}
