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
  const mains = sortCategories(
    categories.filter((category) => category.parent_id === null),
    "custom",
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

  if (category.parent_id) {
    const parent = lookup.get(category.parent_id);
    return {
      id: category.id,
      name: category.name,
      colour: category.colour,
      icon_name: category.icon_name,
      label: parent ? `${parent.name} › ${category.name}` : category.name,
    };
  }

  return {
    id: category.id,
    name: category.name,
    colour: category.colour,
    icon_name: category.icon_name,
    label: category.name,
  };
}
