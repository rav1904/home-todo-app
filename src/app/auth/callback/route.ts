import {
  isCurrentUserAllowed,
  syncAllowedUserId,
} from "@/lib/access/allowed";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Use the same client that just received the session (JWT for is_app_allowed).
      const allowed = await isCurrentUserAllowed(user, supabase);

      if (!allowed) {
        return NextResponse.redirect(`${origin}/access-request`);
      }

      await syncAllowedUserId(supabase);

      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
