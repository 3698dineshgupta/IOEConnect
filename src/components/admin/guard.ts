import "server-only";

import { getProfile, isAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Server-action authorization. Re-checks the admin role on every call (never trusts the client). */
export async function assertAdmin(opts: { superOnly?: boolean } = {}): Promise<{ ok: true; profile: Profile } | { ok: false; error: string }> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return { ok: false, error: "You do not have permission to do that." };
  if (opts.superOnly && profile.role !== "SUPER_ADMIN") return { ok: false, error: "Only a super admin can do that." };
  return { ok: true, profile };
}

export function zodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const i = error.issues[0];
  if (!i) return "Invalid input.";
  const path = i.path.map(String).join(".");
  return path ? `${path}: ${i.message}` : i.message;
}
