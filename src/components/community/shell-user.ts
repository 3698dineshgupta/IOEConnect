import "server-only";

import { getProfile, getSessionUser } from "@/lib/auth";
import type { ShellUser } from "@/components/layout/nav-config";

/** User info for <PublicShell user={...}>; null when signed out. */
export async function getShellUser(): Promise<ShellUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await getProfile();
  return {
    name: profile?.full_name ?? user.email ?? null,
    email: profile?.email ?? user.email ?? null,
    avatar: profile?.avatar ?? null,
    role: profile?.role ?? "USER",
  };
}
