import { createServerClient } from "@supabase/ssr";
import { resolveIsAppAllowed } from "@/lib/access/check";
import { NextResponse, type NextRequest } from "next/server";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/auth");
  const isCallbackRoute = path.startsWith("/auth/callback");
  const isLoginRoute = path === "/auth/login" || path.startsWith("/auth/login/");
  const isAccessRequestRoute =
    path === "/access-request" || path.startsWith("/access-request/");
  const isDashboardRoute = path.startsWith("/dashboard");
  const isProtectedRoute = isDashboardRoute || path === "/";

  if (!user && (isProtectedRoute || isAccessRequestRoute)) {
    return redirectTo(request, "/auth/login");
  }

  if (!user) {
    return supabaseResponse;
  }

  let allowed = false;
  try {
    allowed = await resolveIsAppAllowed(supabase, user.email);
  } catch {
    allowed = false;
  }

  // Authenticated but not approved: never enter the app shell.
  if (!allowed) {
    if (isCallbackRoute || isLoginRoute || isAccessRequestRoute) {
      // Let callback finish / login render / access-request render.
      // (Callback itself redirects unapproved users to /access-request.)
      return supabaseResponse;
    }

    if (isProtectedRoute || isAuthRoute) {
      return redirectTo(request, "/access-request");
    }

    return supabaseResponse;
  }

  // Approved users only: keep them out of login / access-request.
  if (isAccessRequestRoute || isLoginRoute) {
    return redirectTo(request, "/dashboard");
  }

  return supabaseResponse;
}
