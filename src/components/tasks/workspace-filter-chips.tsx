"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";
import { buildCategoryTree } from "@/lib/categories/tree";
import {
  filterChipActiveClassName,
  filterChipClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import { useMemo } from "react";

export type WorkspaceChipId = "all" | string;

type WorkspaceFilterChipsProps = {
  categories: Category[];
  /** Active chip: "all" or a top-level category id (Personal or shared). */
  activeId: WorkspaceChipId;
  onSelect: (id: WorkspaceChipId) => void;
  className?: string;
};

export function WorkspaceFilterChips({
  categories,
  activeId,
  onSelect,
  className = "",
}: WorkspaceFilterChipsProps) {
  const { mains } = useMemo(() => buildCategoryTree(categories), [categories]);

  return (
    <div
      className={`-mx-1 flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
      aria-label="Workspace filter"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeId === "all"}
        onClick={() => onSelect("all")}
        className={`${filterChipClassName} ${
          activeId === "all"
            ? filterChipActiveClassName
            : filterChipIdleClassName
        }`}
      >
        All
      </button>
      {mains.map((main) => {
        const selected = activeId === main.id;
        const name = formatCategoryNameForDisplay(main.name);
        return (
          <button
            key={main.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(main.id)}
            className={`${filterChipClassName} ${
              selected ? filterChipActiveClassName : filterChipIdleClassName
            }`}
            title={main.admin_note ?? name}
          >
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                selected ? "bg-white/20" : ""
              }`}
              style={
                selected
                  ? undefined
                  : { backgroundColor: `${main.colour}22`, color: main.colour }
              }
            >
              <CategoryIcon iconName={main.icon_name} className="h-2.5 w-2.5" />
            </span>
            {name}
          </button>
        );
      })}
    </div>
  );
}
