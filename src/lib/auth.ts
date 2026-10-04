import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export const ADMIN_ROLES: readonly UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isAdmin(profile: Pick<Profile, "role"> | null | undefined): boolean {
  return isAdminRole(profile?.role);
}

/**
 * The authenticated Supabase user for this request (JWT verified with
 * Supabase Auth via getUser()), or null. Deduped per request.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    console.error("[auth] getSessionUser failed", err);
    return null;
  }
});

/** The current user's profile row, or null if signed out. Deduped per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();
    if (error) {
      console.error("[auth] getProfile failed", error);
      return null;
    }
    return data ?? null;
  } catch (err) {
    console.error("[auth] getProfile failed", err);
    return null;
  }
});

function loginRedirect(next?: string): never {
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  redirect(target ? `/login?next=${encodeURIComponent(target)}` : "/login");
}

/**
 * Require a signed-in user. Redirects to /login?next=... otherwise.
 * Returns the auth user and their profile (profile may be null only if the
 * signup trigger has not run yet).
 */
export async function requireUser(next?: string): Promise<{ user: User; profile: Profile | null }> {
  const user = await getSessionUser();
  if (!user) loginRedirect(next);
  const profile = await getProfile();
  return { user, profile };
}

/**
 * Require ADMIN or SUPER_ADMIN. Redirects to /login when signed out and to
 * /dashboard when signed in without admin rights.
 */
export async function requireAdmin(next?: string): Promise<{ user: User; profile: Profile }> {
  const user = await getSessionUser();
  if (!user) loginRedirect(next ?? "/admin");
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) redirect("/dashboard");
  return { user, profile };
}

/** Require SUPER_ADMIN (role management etc.). */
export async function requireSuperAdmin(next?: string): Promise<{ user: User; profile: Profile }> {
  const result = await requireAdmin(next);
  if (result.profile.role !== "SUPER_ADMIN") redirect("/admin");
  return result;
}
