"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavItems = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "☑" },
];

const adminNavItem = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: "⚙",
};

type SidebarProps = {
  showAdminLink?: boolean;
};

export function Sidebar({ showAdminLink = false }: SidebarProps) {
  const pathname = usePathname();
  const navItems = showAdminLink
    ? [...baseNavItems, adminNavItem]
    : baseNavItems;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex h-16 items-center gap-3 border-b border-stone-200 px-5 dark:border-stone-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white">
          H
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Workspace
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Your To Do List
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-stone-200 p-4 dark:border-stone-800">
        <ThemeToggle />
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Private task management app
        </p>
      </div>
    </aside>
  );
}
