import type { Category } from "@/lib/categories/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CATEGORY_SELECT_FIELDS =
  "id, parent_id, name, colour, icon_name, sort_order, active, scope, user_id, created_at, updated_at";

export function findPersonalCategory(categories: Category[]) {
  return (
    categories.find(
      (category) =>
        category.scope === "personal" ||
        (category.parent_id === null && category.name === "Personal"),
    ) ?? null
  );
}

export function getPersonalCategoryId(categories: Category[]) {
  return findPersonalCategory(categories)?.id ?? null;
}

/** Ensures the signed-in user has a Personal category; returns its id. */
export async function ensureMyPersonalCategory(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("ensure_my_personal_category");

  if (error) {
    return { id: null as string | null, error };
  }

  return { id: (data as string | null) ?? null, error: null };
}

export function sortMainsPersonalFirst(mains: Category[]) {
  return [...mains].sort((left, right) => {
    const leftPersonal = left.scope === "personal" ? 0 : 1;
    const rightPersonal = right.scope === "personal" ? 0 : 1;
    if (leftPersonal !== rightPersonal) {
      return leftPersonal - rightPersonal;
    }
    return (
      left.sort_order - right.sort_order || left.name.localeCompare(right.name)
    );
  });
}

/** Ensure Personal exists, then load active categories visible under RLS. */
export async function loadAccessibleCategories(supabase: SupabaseClient) {
  const ensureResult = await ensureMyPersonalCategory(supabase);
  if (ensureResult.error) {
    return {
      categories: [] as Category[],
      personalCategoryId: null as string | null,
      error: ensureResult.error,
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_SELECT_FIELDS)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return {
      categories: [] as Category[],
      personalCategoryId: ensureResult.id,
      error,
    };
  }

  const categories = (data ?? []) as Category[];
  const personalCategoryId =
    ensureResult.id ?? getPersonalCategoryId(categories);

  return { categories, personalCategoryId, error: null };
}
