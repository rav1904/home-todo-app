import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for admin-only server operations:
 * - Supabase Auth Admin API (list users)
 * - Aggregate task counts via select("user_id, completed") only
 *
 * Do not select task title, description, due_at, or other task content.
 * Do not use for normal app routes or user-session task queries.
 */
export function createAdminAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
