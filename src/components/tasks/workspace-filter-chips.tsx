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
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export type WorkspaceChipId = "all" | string;

/** Collapsed row shows All + this many top-level workspaces. */
const COLLAPSED_MAIN_LIMIT = 3;

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
      className={`${filterChipClassName} max-w-[9.5rem] ${
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
  const { mains } = useMemo(() => buildCategoryTree(categories), [categories]);
  const [moreOpen, setMoreOpen] = useState(false);

  const { visible, hidden } = useMemo(() => {
    if (moreOpen || mains.length <= COLLAPSED_MAIN_LIMIT) {
      return { visible: mains, hidden: [] as Category[] };
    }

    const activeMain = mains.find((main) => main.id === activeId);
    const needsPromote = Boolean(
      activeMain && !mains.slice(0, COLLAPSED_MAIN_LIMIT).includes(activeMain),
    );

    if (!needsPromote || !activeMain) {
      return {
        visible: mains.slice(0, COLLAPSED_MAIN_LIMIT),
        hidden: mains.slice(COLLAPSED_MAIN_LIMIT),
      };
    }

    const head = mains
      .slice(0, COLLAPSED_MAIN_LIMIT - 1)
      .filter((main) => main.id !== activeMain.id);
    const visibleMains = [...head, activeMain];
    const hiddenMains = mains.filter(
      (main) => !visibleMains.some((entry) => entry.id === main.id),
    );
    return { visible: visibleMains, hidden: hiddenMains };
  }, [mains, activeId, moreOpen]);

  const hasMore = mains.length > COLLAPSED_MAIN_LIMIT;

  return (
    <div
      className={`flex max-w-full flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
      aria-label="Workspace filter"
    >
      <WorkspaceChip
        selected={activeId === "all"}
        onClick={() => {
          onSelect("all");
          setMoreOpen(false);
        }}
      >
        All
      </WorkspaceChip>
      {visible.map((main) => {
        const selected = activeId === main.id;
        const name = formatCategoryNameForDisplay(main.name);
        return (
          <WorkspaceChip
            key={main.id}
            selected={selected}
            onClick={() => {
              onSelect(main.id);
              setMoreOpen(false);
            }}
            title={main.admin_note ?? name}
          >
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                selected ? "bg-white/20" : ""
              }`}
              style={
                selected
                  ? undefined
                  : { backgroundColor: `${main.colour}22`, color: main.colour }
              }
            >
              <CategoryIcon iconName={main.icon_name} className="h-3 w-3" />
            </span>
            <span className="truncate">{name}</span>
          </WorkspaceChip>
        );
      })}
      {hasMore ? (
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-label={
            moreOpen
              ? "Show fewer workspaces"
              : `More workspaces (${hidden.length || mains.length - COLLAPSED_MAIN_LIMIT})`
          }
          onClick={() => setMoreOpen((open) => !open)}
          className={`${filterChipClassName} ${filterChipIdleClassName}`}
        >
          {moreOpen ? "Less" : "More"}
          {moreOpen ? (
            <ChevronUp className="h-3.5 w-3.5 opacity-70" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
