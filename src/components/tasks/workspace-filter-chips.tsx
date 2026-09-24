"use client";

import { CategoryIcon } from "@/lib/categories/icons";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import { sortCategoriesByDisplayName } from "@/lib/categories/sort";
import type { Category } from "@/lib/categories/types";
import { buildCategoryTree } from "@/lib/categories/tree";
import {
  compactFilterChipClassName,
  filterChipActiveClassName,
  filterChipIdleClassName,
} from "@/lib/ui/field-classes";
import { useMemo, type ReactNode } from "react";

export type WorkspaceChipId = "all" | string;

type WorkspaceFilterChipsProps = {
  categories: Category[];
  /** Active chip: "all" or a top-level category id (Personal or shared). */
  activeId: WorkspaceChipId;
  onSelect: (id: WorkspaceChipId) => void;
  className?: string;
};

function WorkspaceChip({
  selected,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      title={title}
      className={`${compactFilterChipClassName} max-w-[8.5rem] ${
        selected ? filterChipActiveClassName : filterChipIdleClassName
      }`}
    >
      {children}
    </button>
  );
}

export function WorkspaceFilterChips({
  categories,
  activeId,
  onSelect,
  className = "",
}: WorkspaceFilterChipsProps) {
  const mains = useMemo(
    () =>
      sortCategoriesByDisplayName(buildCategoryTree(categories).mains),
    [categories],
  );

  return (
    <div
      className={`flex max-w-full min-w-0 flex-nowrap gap-1 overflow-x-auto overscroll-x-contain pb-0.5 md:flex-wrap md:overflow-x-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
      aria-label="Workspace filter"
    >
      <WorkspaceChip
        selected={activeId === "all"}
        onClick={() => onSelect("all")}
      >
        All
      </WorkspaceChip>
      {mains.map((main) => {
        const selected = activeId === main.id;
        const name = formatCategoryNameForDisplay(main.name);
        return (
          <WorkspaceChip
            key={main.id}
            selected={selected}
            onClick={() => onSelect(main.id)}
            title={main.admin_note ?? name}
          >
            <span
              className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
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
            <span className="truncate">{name}</span>
          </WorkspaceChip>
        );
      })}
    </div>
  );
}
