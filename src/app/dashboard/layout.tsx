import { QuickAddTaskLauncher } from "@/components/tasks/quick-add-task-launcher";
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
    <div className="flex min-h-full flex-1 bg-stone-50 dark:bg-stone-950">
      <Sidebar showAdminLink={showAdminLink} />
      <div className="relative flex min-w-0 flex-1 flex-col pb-24">
        {children}
        <QuickAddTaskLauncher />
      </div>
    </div>
  );
}
