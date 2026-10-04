import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Exact-or-subpath protected routes. Admin role is checked server-side (requireAdmin). */
const PROTECTED_EXACT = ["/dashboard", "/profile", "/referrals", "/payment-history", "/settings"];
/** Raw prefixes (match anything starting with them). */
const PROTECTED_RAW_PREFIXES = ["/my-", "/admin"];

export function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_RAW_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PROTECTED_EXACT.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

/**
 * Refreshes the Supabase session cookie and redirects unauthenticated users
 * away from protected routes to /login?next=<path>.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Misconfigured: fail closed on protected routes.
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() revalidates the JWT with Supabase Auth and refreshes cookies.
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { pathname, search } = request.nextUrl;
  if (!userId && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    // carry refreshed/cleared auth cookies over
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
