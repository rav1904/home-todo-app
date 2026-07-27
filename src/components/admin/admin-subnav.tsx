"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/dashboard/admin", label: "Users" },
  { href: "/dashboard/admin/categories", label: "Categories" },
  { href: "/dashboard/admin/labels", label: "Labels" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-stone-200 bg-white px-8 py-3">
      <div className="flex gap-2">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard/admin"
              ? pathname === "/dashboard/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
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
