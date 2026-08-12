import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskCreatorProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export async function loadTaskCreatorProfiles(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Record<string, TaskCreatorProfile>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase.rpc("get_task_creator_profiles", {
    p_user_ids: uniqueIds,
  });

  if (error || !data) {
    return {};
  }

  const map: Record<string, TaskCreatorProfile> = {};
  for (const row of data as Array<{
    id: string;
    email: string | null;
    display_name: string;
    avatar_url: string | null;
  }>) {
    map[row.id] = {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    };
  }
  return map;
}

/** UI + RLS-aligned delete rule for shared workspaces. */
export function canDeleteSharedTask(options: {
  currentUserId: string;
  isAdmin: boolean;
  taskUserId: string;
  categoryId: string | null;
  categoryScope: "personal" | "global" | null;
}): boolean {
  if (options.taskUserId === options.currentUserId) {
    return true;
  }

  if (
    options.isAdmin &&
    options.categoryId !== null &&
    options.categoryScope === "global"
  ) {
    return true;
  }

  return false;
}
