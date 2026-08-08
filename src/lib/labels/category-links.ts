import type { Category } from "@/lib/categories/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LabelCategoryLink = {
  label_id: string;
  category_id: string;
};

export const LABEL_CATEGORY_LINK_FIELDS = "label_id, category_id";

export function groupCategoryIdsByLabel(
  links: LabelCategoryLink[],
): Record<string, string[]> {
  return links.reduce<Record<string, string[]>>((accumulator, link) => {
    if (!accumulator[link.label_id]) {
      accumulator[link.label_id] = [];
    }

    accumulator[link.label_id].push(link.category_id);
    return accumulator;
  }, {});
}

export function toggleCategoryId(selectedIds: string[], categoryId: string) {
  if (selectedIds.includes(categoryId)) {
    return selectedIds.filter((id) => id !== categoryId);
  }

  return [...selectedIds, categoryId];
}

export function getLinkedCategorySummary(
  categoryIds: string[],
  categoryLookup: Map<string, Category>,
) {
  if (categoryIds.length === 0) {
    return "Not linked to any category";
  }

  const names = categoryIds
    .map((categoryId) => categoryLookup.get(categoryId))
    .filter((category): category is Category => category !== undefined)
    .map((category) => {
      if (!category.parent_id) {
        return category.name;
      }

      const parent = categoryLookup.get(category.parent_id);
      return parent ? `${parent.name} > ${category.name}` : category.name;
    })
    .sort((left, right) => left.localeCompare(right));

  if (names.length === 0) {
    return `${categoryIds.length} linked categor${categoryIds.length === 1 ? "y" : "ies"}`;
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

/** Category ids whose linked global labels should appear in the task picker. */
export function getRelevantCategoryIdsForLabelPicker(
  categoryId: string | null,
  categoryLookup: Map<string, Category>,
): string[] {
  if (!categoryId) {
    return [];
  }

  const category = categoryLookup.get(categoryId);
  if (!category) {
    return [];
  }

  // Personal category → personal labels only (same as no category).
  if (category.scope === "personal") {
    return [];
  }

  if (category.parent_id) {
    return [category.id, category.parent_id];
  }

  return [category.id];
}

export function isGlobalLabelLinkedToCategories(
  labelId: string,
  relevantCategoryIds: string[],
  categoryIdsByLabelId: Record<string, string[]>,
) {
  if (relevantCategoryIds.length === 0) {
    return false;
  }

  const linkedCategoryIds = categoryIdsByLabelId[labelId] ?? [];
  return linkedCategoryIds.some((categoryId) =>
    relevantCategoryIds.includes(categoryId),
  );
}

export async function syncLabelCategoryLinks(
  supabase: SupabaseClient,
  labelId: string,
  categoryIds: string[],
) {
  const uniqueCategoryIds = [...new Set(categoryIds)];

  const { data: existingRows, error: existingError } = await supabase
    .from("label_categories")
    .select(LABEL_CATEGORY_LINK_FIELDS)
    .eq("label_id", labelId);

  if (existingError) {
    return existingError;
  }

  const existingIds = new Set(
    (existingRows ?? []).map((row) => row.category_id as string),
  );
  const nextIds = new Set(uniqueCategoryIds);

  const toInsert = uniqueCategoryIds.filter(
    (categoryId) => !existingIds.has(categoryId),
  );
  const toDelete = [...existingIds].filter(
    (categoryId) => !nextIds.has(categoryId),
  );

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("label_categories")
      .delete()
      .eq("label_id", labelId)
      .in("category_id", toDelete);

    if (deleteError) {
      return deleteError;
    }
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("label_categories")
      .insert(
        toInsert.map((categoryId) => ({
          label_id: labelId,
          category_id: categoryId,
        })),
      );

    if (insertError) {
      return insertError;
    }
  }

  return null;
}
