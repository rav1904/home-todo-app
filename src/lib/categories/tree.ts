import { sortMainsPersonalFirst } from "@/lib/categories/access";
import { formatCategoryNameForDisplay } from "@/lib/categories/display";
import { sortCategories } from "@/lib/categories/sort";
import type { Category } from "@/lib/categories/types";

export type CategoryTree = {
  mains: Category[];
  subsByParent: Record<string, Category[]>;
};

export type CategoryDisplay = {
  id: string;
  name: string;
  colour: string;
  icon_name: string;
  label: string;
};

export function buildCategoryTree(categories: Category[]): CategoryTree {
  const mains = sortMainsPersonalFirst(
    categories.filter((category) => category.parent_id === null),
  );

  const subsByParent: Record<string, Category[]> = {};

  for (const category of categories) {
    if (!category.parent_id) {
      continue;
    }

    if (!subsByParent[category.parent_id]) {
      subsByParent[category.parent_id] = [];
    }

    subsByParent[category.parent_id].push(category);
  }

  for (const parentId of Object.keys(subsByParent)) {
    subsByParent[parentId] = sortCategories(subsByParent[parentId], "custom");
  }

  return { mains, subsByParent };
}

export type CategorySelection = {
  mainCategoryId: string | null;
  subCategoryId: string | null;
};

export function splitCategorySelection(
  categoryId: string | null,
  lookup: Map<string, Category>,
): CategorySelection {
  if (!categoryId) {
    return { mainCategoryId: null, subCategoryId: null };
  }

  const category = lookup.get(categoryId);

  if (!category) {
    return { mainCategoryId: null, subCategoryId: null };
  }

  if (category.parent_id) {
    return {
      mainCategoryId: category.parent_id,
      subCategoryId: category.id,
    };
  }

  return { mainCategoryId: category.id, subCategoryId: null };
}

export function resolveCategoryIdForSave(
  mainCategoryId: string | null,
  subCategoryId: string | null,
): string | null {
  if (!mainCategoryId) {
    return null;
  }

  if (subCategoryId) {
    return subCategoryId;
  }

  return mainCategoryId;
}

export function buildCategoryLookup(categories: Category[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function getCategoryDisplay(
  categoryId: string | null,
  lookup: Map<string, Category>,
): CategoryDisplay | null {
  if (!categoryId) {
    return null;
  }

  const category = lookup.get(categoryId);

  if (!category) {
    return null;
  }

  const name = formatCategoryNameForDisplay(category.name);

  if (category.parent_id) {
    const parent = lookup.get(category.parent_id);
    const parentName = parent
      ? formatCategoryNameForDisplay(parent.name)
      : null;
    return {
      id: category.id,
      name,
      colour: category.colour,
      icon_name: category.icon_name,
      label: parentName ? `${parentName} > ${name}` : name,
    };
  }

  return {
    id: category.id,
    name,
    colour: category.colour,
    icon_name: category.icon_name,
    label: name,
  };
}
