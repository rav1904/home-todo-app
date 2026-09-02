import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskCreatorProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type TaskUserProfile = TaskCreatorProfile;

export function collectTaskPeopleIds(
  tasks: Array<{ user_id: string; assigned_to?: string | null }>,
  currentUserId: string | null,
): string[] {
  const ids: string[] = [];
  for (const task of tasks) {
    if (task.user_id && task.user_id !== currentUserId) {
      ids.push(task.user_id);
    }
    if (task.assigned_to) {
      ids.push(task.assigned_to);
    }
  }
  return ids;
}

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

/** Show creator on a task row only when it is someone else's shared-workspace task. */
export function shouldShowTaskCreator(options: {
  taskUserId: string;
  currentUserId: string;
  categoryId: string | null;
  categoryScope: "personal" | "global" | null;
}): boolean {
  if (options.taskUserId === options.currentUserId) {
    return false;
  }

  if (!options.categoryId) {
    return false;
  }

  if (options.categoryScope === "personal") {
    return false;
  }

  return true;
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
