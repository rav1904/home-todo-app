import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isAdminUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const showAdminLink = isAdminUser(user?.email);

  return (
    <DashboardShell showAdminLink={showAdminLink}>{children}</DashboardShell>
  );
}
