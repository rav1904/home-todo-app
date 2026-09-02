import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getUserDisplayName } from "@/lib/auth/user-display";

function readOverride(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function fetchDisplayNameOverride(
  supabase: SupabaseClient,
  email: string | null | undefined,
): Promise<string | null> {
  if (!email?.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_allowed_users")
    .select("display_name_override")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    return null;
  }

  return readOverride(data?.display_name_override);
}

export async function fetchEffectiveDisplayName(
  supabase: SupabaseClient,
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
  fallback: string,
): Promise<string> {
  if (!user) {
    return fallback;
  }

  const override = await fetchDisplayNameOverride(supabase, user.email);
  return getUserDisplayName(
    user.user_metadata,
    user.email,
    fallback,
    override,
  );
}
