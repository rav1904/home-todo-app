import { getPersonalCategoryId } from "@/lib/categories/access";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import type { Category } from "@/lib/categories/types";
import {
  buildCategoryLookup,
  buildCategoryTree,
} from "@/lib/categories/tree";
import type { TaskCreatorProfile } from "@/lib/tasks/creators";
import { focusAssigneeTowerOwner } from "@/lib/tasks/task-people";

export type FocusBoardColumn<T> = {
  id: string;
  title: string;
  colour: string | null;
  tasks: T[];
};

export function resolveTopLevelCategoryId(
  categoryId: string | null,
  lookup: Map<string, Category>,
  fallbackId: string,
): string {
  if (!categoryId) {
    return fallbackId;
  }

  const category = lookup.get(categoryId);
  if (!category) {
    return fallbackId;
  }

  return category.parent_id ?? category.id;
}

export function groupFocusTasksByCategory<
  T extends { category_id: string | null },
>(tasks: T[], categories: Category[]): FocusBoardColumn<T>[] {
  const { mains } = buildCategoryTree(categories);
  const lookup = buildCategoryLookup(categories);
  const personalId = getPersonalCategoryId(categories);
  const fallbackId = personalId ?? mains[0]?.id ?? "personal";

  const columns: FocusBoardColumn<T>[] = mains.map((main) => ({
    id: main.id,
    title: formatCategoryNameForDisplay(main.name),
    colour: main.colour,
    tasks: [],
  }));

  if (columns.length === 0) {
    columns.push({
      id: fallbackId,
      title: "Personal",
      colour: "#57534e",
      tasks: [],
    });
  }

  const byId = new Map(columns.map((column) => [column.id, column]));

  for (const task of tasks) {
    const columnId = resolveTopLevelCategoryId(
      task.category_id,
      lookup,
      fallbackId,
    );
    const column = byId.get(columnId) ?? byId.get(fallbackId) ?? columns[0];
    column.tasks.push(task);
  }

  return columns;
}

export function groupFocusTasksByAssignee<
  T extends {
    assigned_to?: string | null;
    support_assigned_to?: string | null;
  },
>(
  tasks: T[],
  peopleByUserId: Record<string, TaskCreatorProfile>,
  currentUserId: string,
): FocusBoardColumn<T>[] {
  const me: FocusBoardColumn<T> = {
    id: "me",
    title: "Me",
    colour: null,
    tasks: [],
  };
  const unassigned: FocusBoardColumn<T> = {
    id: "unassigned",
    title: "Unassigned",
    colour: null,
    tasks: [],
  };

  const otherColumns: FocusBoardColumn<T>[] = [];
  const otherById = new Map<string, FocusBoardColumn<T>>();

  for (const task of tasks) {
    const ownerId = focusAssigneeTowerOwner(task);
    if (!ownerId) {
      unassigned.tasks.push(task);
      continue;
    }

    if (ownerId === currentUserId) {
      me.tasks.push(task);
      continue;
    }

    let column = otherById.get(ownerId);
    if (!column) {
      column = {
        id: ownerId,
        title: peopleByUserId[ownerId]?.displayName ?? "Member",
        colour: null,
        tasks: [],
      };
      otherById.set(column.id, column);
      otherColumns.push(column);
    }
    column.tasks.push(task);
  }

  otherColumns.sort((left, right) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
  );

  return [me, ...otherColumns, unassigned];
}
