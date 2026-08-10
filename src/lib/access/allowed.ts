import "server-only";

import { resolveIsAppAllowed } from "@/lib/access/check";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

/** True only when `is_app_allowed()` returns true for the current session. */
export async function isCurrentUserAllowed(
  user: User | null | undefined,
  supabaseClient?: SupabaseClient,
): Promise<boolean> {
  if (!user?.email) {
    return false;
  }

  const supabase = supabaseClient ?? (await createClient());
  return resolveIsAppAllowed(supabase, user.email);
}

/**
 * Hard gate for dashboard (and similar) server layouts.
 * No user → login. Authenticated but not allowed → access-request.
 */
export async function requireAppAccess(supabaseClient?: SupabaseClient): Promise<{
  user: User;
  supabase: SupabaseClient;
}> {
  const supabase = supabaseClient ?? (await createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const allowed = await isCurrentUserAllowed(user, supabase);
  if (!allowed) {
    redirect("/access-request");
  }

  return { user, supabase };
}

export async function syncAllowedUserId(
  supabaseClient?: SupabaseClient,
): Promise<void> {
  const supabase = supabaseClient ?? (await createClient());
  await supabase.rpc("sync_my_allowed_user_id");
}
