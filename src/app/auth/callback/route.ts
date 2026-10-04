import "server-only";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 * OAuth callback handler that exchanges the authorization code for a session.
 * Redirects to a safe relative URL (default /dashboard).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Exchange code for session
  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth callback] exchange failed", error);
      redirect("/login");
    }
  }

  // Validate and redirect to a safe URL
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(target);
}
