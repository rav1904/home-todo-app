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

function displayNameOverrideErrorMessage(message: string | undefined) {
  const text = message ?? "";
  if (text.includes("not_admin")) {
    return "Only an admin can update display names.";
  }
  if (text.includes("not_found")) {
    return "That user is not on the allowlist.";
  }
  if (text.includes("display_name_too_long")) {
    return "Display name must be 40 characters or fewer.";
  }
  if (text.includes("invalid_display_name")) {
    return "Display name cannot include control characters.";
  }
  if (text.includes("invalid_email")) {
    return "A valid email is required.";
  }
  return text || "Could not update display name.";
}

export async function setDisplayNameOverride(
  email: string,
  displayNameOverride: string | null,
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_set_display_name_override", {
    p_email: email,
    p_display_name_override: displayNameOverride,
  });

  if (!error) {
    return { error: null };
  }

  return {
    error: { message: displayNameOverrideErrorMessage(error.message) },
  };
}
