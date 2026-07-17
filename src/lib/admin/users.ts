import "server-only";

import {
  fetchTaskCountsByUserId,
  getTaskCountsForUser,
  type UserTaskCounts,
} from "@/lib/admin/task-counts";
import { createAdminAuthClient } from "@/lib/supabase/admin";

export type AppUserSummary = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  taskCounts: UserTaskCounts;
};

const RECENT_JOIN_DAYS = 7;

function readGoogleDisplayName(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  const fullName = metadata.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  const name = metadata.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return null;
}

function readGoogleAvatarUrl(
  metadata: Record<string, unknown> | undefined,
): string | null {
  if (!metadata) {
    return null;
  }

  const avatarUrl = metadata.avatar_url;
  if (typeof avatarUrl === "string" && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  const picture = metadata.picture;
  if (typeof picture === "string" && picture.trim()) {
    return picture.trim();
  }

  return null;
}

export async function listAppUsersWithTaskCounts(): Promise<AppUserSummary[]> {
  const [taskCountsByUserId, authUsers] = await Promise.all([
    fetchTaskCountsByUserId(),
    listAuthUsers(),
  ]);

  return authUsers.map((user) => ({
    ...user,
    taskCounts: getTaskCountsForUser(taskCountsByUserId, user.id),
  }));
}

async function listAuthUsers(): Promise<
  Omit<AppUserSummary, "taskCounts">[]
> {
  const adminClient = createAdminAuthClient();
  const users: Omit<AppUserSummary, "taskCounts">[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    for (const user of data.users) {
      const metadata = user.user_metadata as Record<string, unknown> | undefined;

      users.push({
        id: user.id,
        email: user.email ?? null,
        displayName: readGoogleDisplayName(metadata),
        avatarUrl: readGoogleAvatarUrl(metadata),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function countRecentlyJoinedUsers(
  users: Pick<AppUserSummary, "createdAt">[],
  days = RECENT_JOIN_DAYS,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return users.filter((user) => new Date(user.createdAt) >= cutoff).length;
}

export { RECENT_JOIN_DAYS };
