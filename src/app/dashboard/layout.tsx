import { Sidebar } from "@/components/dashboard/sidebar";
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
    <div className="flex min-h-full flex-1 bg-stone-50">
      <Sidebar showAdminLink={showAdminLink} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
