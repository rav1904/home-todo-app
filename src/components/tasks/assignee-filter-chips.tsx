"use client";

import type { TaskCreatorProfile } from "@/lib/tasks/creators";
import {
  assigneeFiltersEqual,
  type TaskAssigneeFilter,
} from "@/lib/tasks/assignee-filter";

type AssigneeFilterChipsProps = {
  active: TaskAssigneeFilter;
  currentUserId: string;
  people: TaskCreatorProfile[];
  onSelect: (filter: TaskAssigneeFilter) => void;
  className?: string;
};

function Chip({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`inline-flex min-h-7 shrink-0 cursor-pointer items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
        selected
          ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
      }`}
    >
      <span className="max-w-[7.5rem] truncate">{label}</span>
    </button>
  );
}

export function AssigneeFilterChips({
  active,
  currentUserId,
  people,
  onSelect,
  className = "",
}: AssigneeFilterChipsProps) {
  const meSelected =
    active.type === "me" ||
    (active.type === "user" && active.userId === currentUserId);

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span className="shrink-0 text-[11px] font-medium text-stone-400 dark:text-stone-500">
        Assigned:
      </span>
      <div
        className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Assignee filter"
      >
        <Chip
          selected={active.type === "all"}
          onClick={() => onSelect({ type: "all" })}
          label="Everyone"
        />
        <Chip
          selected={meSelected}
          onClick={() => onSelect({ type: "me" })}
          label="Me"
        />
        {people.map((person) => (
          <Chip
            key={person.id}
            selected={assigneeFiltersEqual(active, {
              type: "user",
              userId: person.id,
            })}
            onClick={() => onSelect({ type: "user", userId: person.id })}
            label={person.displayName}
          />
        ))}
        <Chip
          selected={active.type === "unassigned"}
          onClick={() => onSelect({ type: "unassigned" })}
          label="Unassigned"
        />
      </div>
    </div>
  );
}
