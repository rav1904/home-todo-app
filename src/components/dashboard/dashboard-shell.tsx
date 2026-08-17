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
      <div className="flex min-h-full max-w-[100vw] flex-1 overflow-x-hidden bg-stone-50 dark:bg-stone-950">
        <Sidebar showAdminLink={showAdminLink} />
        <div className="relative flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden pb-24">
          {children}
        </div>
        <QuickAddTaskLauncher />
      </div>
    </DashboardNavProvider>
  );
}
