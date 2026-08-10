import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server/proxy access check — must stay aligned with SQL `is_app_allowed()`.
 * - Missing email → blocked
 * - RPC error / throw → blocked
 * - Only `data === true` is allowed
 *
 * Do not short-circuit on ADMIN_EMAIL here. SQL `is_app_admin()` inside
 * `is_app_allowed()` is the source of truth so the app gate cannot disagree with RLS.
 */
export async function resolveIsAppAllowed(
  supabase: SupabaseClient,
  email: string | undefined | null,
): Promise<boolean> {
  if (!email || !email.trim()) {
    return false;
  }

  try {
    const { data, error } = await supabase.rpc("is_app_allowed");

    if (error) {
      return false;
    }

    return data === true;
  } catch {
    return false;
  }
}
