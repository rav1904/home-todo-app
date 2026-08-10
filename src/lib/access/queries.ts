import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AccessRequestRow = {
  id: string;
  email: string;
  user_id: string;
  display_name: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type AllowedUserRow = {
  id: string;
  email: string;
  user_id: string | null;
  status: "approved" | "revoked";
  source: "manual" | "request" | "bootstrap";
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export async function listPendingAccessRequests(): Promise<AccessRequestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("access_requests")
    .select(
      "id, email, user_id, display_name, message, status, created_at, reviewed_at, reviewed_by",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AccessRequestRow[];
}

export async function listAllowedUsersByStatus(
  status: "approved" | "revoked",
): Promise<AllowedUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_allowed_users")
    .select(
      "id, email, user_id, status, source, created_at, updated_at, revoked_at",
    )
    .eq("status", status)
    .order("email", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AllowedUserRow[];
}

export async function getMyPendingAccessRequest(): Promise<AccessRequestRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("access_requests")
    .select(
      "id, email, user_id, display_name, message, status, created_at, reviewed_at, reviewed_by",
    )
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AccessRequestRow | null) ?? null;
}
