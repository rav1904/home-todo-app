"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "☑" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-stone-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white">
          H
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Home Tasks</p>
          <p className="text-xs text-stone-500">Your household</p>
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
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 p-4">
        <p className="text-xs text-stone-400">Private home workspace</p>
      </div>
    </aside>
  );
}
