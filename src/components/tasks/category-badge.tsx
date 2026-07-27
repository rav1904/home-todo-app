"use client";

import { CategoryIcon } from "@/lib/categories/icons";

type CategoryBadgeProps = {
  category: {
    label: string;
    colour: string;
    icon_name: string;
  } | null;
  unavailable?: boolean;
};

export function CategoryBadge({
  category,
  unavailable = false,
}: CategoryBadgeProps) {
  if (unavailable) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">
        Category unavailable
      </span>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: category.colour }}
    >
      <CategoryIcon iconName={category.icon_name} className="h-3.5 w-3.5" />
      {category.label}
    </span>
  );
}
