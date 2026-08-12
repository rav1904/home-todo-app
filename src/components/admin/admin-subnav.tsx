"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/dashboard/admin", label: "Users" },
  { href: "/dashboard/admin/access", label: "Access" },
  { href: "/dashboard/admin/categories", label: "Workspaces" },
  { href: "/dashboard/admin/labels", label: "Labels" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-stone-200/80 bg-white px-4 py-2.5 sm:px-6 lg:px-8 dark:border-stone-800 dark:bg-stone-900">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard/admin"
              ? pathname === "/dashboard/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
