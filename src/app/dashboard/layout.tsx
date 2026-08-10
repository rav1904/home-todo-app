import { requireAppAccess, syncAllowedUserId } from "@/lib/access/allowed";
import { isAdminUser } from "@/lib/admin";
import { ensureMyPersonalCategory } from "@/lib/categories/access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Runs before shell/header/sidebar — blocks unapproved users.
  const { user, supabase } = await requireAppAccess();

  await syncAllowedUserId(supabase);
  await ensureMyPersonalCategory(supabase);

  const showAdminLink = isAdminUser(user.email);

  return (
    <DashboardShell showAdminLink={showAdminLink}>{children}</DashboardShell>
  );
}
