import "server-only";

import {
  getUserAuthName,
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/lib/auth/user-display";
import { createAdminAuthClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AppUserSummary = {
  id: string;
  email: string | null;
  authDisplayName: string | null;
  displayNameOverride: string | null;
  hasAllowlistRow: boolean;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type AllowlistNameRow = {
  email: string;
  display_name_override: string | null;
};

async function loadAllowlistNameRows(): Promise<Map<string, AllowlistNameRow>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_allowed_users")
    .select("email, display_name_override");

  const map = new Map<string, AllowlistNameRow>();
  if (error || !data) {
    return map;
  }

  for (const row of data as AllowlistNameRow[]) {
    map.set(row.email.toLowerCase(), row);
  }
  return map;
}

const RECENT_JOIN_DAYS = 7;

export async function listAppUsers(): Promise<AppUserSummary[]> {
  const adminClient = createAdminAuthClient();
  const allowlistByEmail = await loadAllowlistNameRows();
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
      const metadata = user.user_metadata;
      const email = user.email ?? null;
      const allowlist = email
        ? allowlistByEmail.get(email.toLowerCase())
        : undefined;
      const override = allowlist?.display_name_override ?? null;
      users.push({
        id: user.id,
        email,
        authDisplayName: getUserAuthName(metadata),
        displayNameOverride: override,
        hasAllowlistRow: Boolean(allowlist),
        displayName: getUserDisplayName(
          metadata,
          user.email,
          "Unknown user",
          override,
        ),
        avatarUrl: getUserAvatarUrl(metadata),
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
