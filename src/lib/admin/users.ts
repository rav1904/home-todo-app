import "server-only";

import { createAdminAuthClient } from "@/lib/supabase/admin";

export type AppUserSummary = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

const RECENT_JOIN_DAYS = 7;

export async function listAppUsers(): Promise<AppUserSummary[]> {
  const adminClient = createAdminAuthClient();
  const users: AppUserSummary[] = [];
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
      users.push({
        id: user.id,
        email: user.email ?? null,
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
  users: AppUserSummary[],
  days = RECENT_JOIN_DAYS,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return users.filter((user) => new Date(user.createdAt) >= cutoff).length;
}

export { RECENT_JOIN_DAYS };
