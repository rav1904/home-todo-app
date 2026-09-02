import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskUserProfile } from "@/lib/tasks/creators";

export async function loadAssignableUsersForCategory(
  supabase: SupabaseClient,
  categoryId: string | null,
): Promise<TaskUserProfile[]> {
  const { data, error } = await supabase.rpc(
    "get_assignable_users_for_category",
    { p_category_id: categoryId },
  );

  if (error || !data) {
    return [];
  }

  return (data as Array<{
    id: string;
    email: string | null;
    display_name: string;
    avatar_url: string | null;
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }));
}
