"use client";

import { DashboardNavProvider } from "@/components/dashboard/nav-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { QuickAddTaskLauncher } from "@/components/tasks/quick-add-task-launcher";
import type { ReactNode } from "react";

type DashboardShellProps = {
  showAdminLink?: boolean;
  children: ReactNode;
};

export function DashboardShell({
  showAdminLink = false,
  children,
}: DashboardShellProps) {
  return (
    <DashboardNavProvider>
      <div className="flex min-h-full flex-1 bg-stone-50 dark:bg-stone-950">
        <Sidebar showAdminLink={showAdminLink} />
        <div className="relative flex min-w-0 flex-1 flex-col pb-24 md:pl-60">
          {children}
          <QuickAddTaskLauncher />
        </div>
      </div>
    </DashboardNavProvider>
  );
}
