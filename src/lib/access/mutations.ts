import { createClient } from "@/lib/supabase/client";

export async function submitAccessRequest(message: string | null) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_access_request", {
    p_message: message,
  });

  return { id: (data as string | null) ?? null, error };
}

export async function approveAccessRequest(requestId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_approve_access_request", {
    p_request_id: requestId,
  });
  return { error };
}

export async function rejectAccessRequest(requestId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_reject_access_request", {
    p_request_id: requestId,
  });
  return { error };
}

export async function addAllowedEmail(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_add_allowed_email", {
    p_email: email,
  });
  return { id: (data as string | null) ?? null, error };
}

export async function revokeAllowedEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_revoke_allowed_email", {
    p_email: email,
  });
  return { error };
}

export async function reapproveAllowedEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_reapprove_allowed_email", {
    p_email: email,
  });
  return { error };
}
