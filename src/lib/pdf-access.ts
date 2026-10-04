import "server-only";

import type { User } from "@supabase/supabase-js";
import { canAccessResource } from "@/lib/access";
import { scopeProfileToSubject } from "@/lib/program-premium";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/server";
import type { AccessType, Profile, ResourceStatus, ResourceType } from "@/lib/types";

/**
 * Shared authorization for the PDF viewer, token and stream routes.
 * Uses the service-role client because it needs telegram_file_id; callers
 * must never return `fileId` to the browser.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ViewerResource {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  access_type: AccessType;
  status: ResourceStatus;
  page_count: number | null;
  available_years: number[];
  year_page_ranges: Record<string, [number, number]>;
  exam_type: string | null;
  compressed_file_size: number | null;
  file_size: number | null;
}

/** Server-only extension carrying the storage pointer. */
export interface StoredResource extends ViewerResource {
  fileId: string | null;
}

const COLUMNS =
  "id, subject_id, title, description, resource_type, access_type, status, page_count, available_years, year_page_ranges, exam_type, compressed_file_size, file_size, telegram_file_id";

/** Load a resource (any status) with its storage pointer. null if not found/invalid id. */
export async function loadStoredResource(resourceId: string): Promise<StoredResource | null> {
  if (!UUID_RE.test(resourceId)) return null;
  const { data, error } = await createAdminClient().from("resources").select(COLUMNS).eq("id", resourceId).maybeSingle();
  if (error) {
    console.error("[pdf-access] resource lookup failed", { resourceId, error: error.message });
    throw new Error("resource lookup failed");
  }
  if (!data) return null;
  const { telegram_file_id, ...rest } = data as ViewerResource & { telegram_file_id: string | null };
  return {
    ...rest,
    available_years: rest.available_years ?? [],
    year_page_ranges: normalizeRanges(rest.year_page_ranges),
    fileId: telegram_file_id,
  };
}

function normalizeRanges(v: unknown): Record<string, [number, number]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, [number, number]> = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(r) && r.length === 2 && r.every((n) => Number.isInteger(n) && n >= 1) && r[0] <= r[1]) {
      out[k] = [r[0] as number, r[1] as number];
    }
  }
  return out;
}

/** Strip the storage pointer before handing data to client components. */
export function toViewerResource(r: StoredResource): ViewerResource {
  const { fileId, ...rest } = r;
  void fileId;
  return rest;
}

export type AccessDecision =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404; code: "LOGIN_REQUIRED" | "PREMIUM_REQUIRED" | "NOT_FOUND"; message: string };

/**
 * Decide whether `user`/`profile` may view `resource`.
 * - unpublished (non-admin) -> NOT_FOUND
 * - PREMIUM needs premium for the subject's program (see program-premium.ts)
 * - PREMIUM and signed out -> LOGIN_REQUIRED, signed in without premium -> PREMIUM_REQUIRED
 * - FREE and site requires login for free resources and signed out -> LOGIN_REQUIRED
 */
export async function decideAccess(
  user: User | null,
  profile: Profile | null,
  resource: Pick<ViewerResource, "access_type" | "status" | "subject_id">,
): Promise<AccessDecision> {
  const isAdminUser = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
  if (!isAdminUser && resource.status !== "PUBLISHED") {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "This resource is not available." };
  }
  if (resource.access_type === "FREE" && !user) {
    const settings = await getSetting("resources");
    if (settings.require_login_for_free) {
      return { ok: false, status: 401, code: "LOGIN_REQUIRED", message: "Please sign in to view this resource." };
    }
  }
  // A signed-in user without a profile row is treated as a regular user.
  // Premium is per program: only premium members of this subject's program (or a program sharing it) pass.
  const base = user ? (profile ?? { id: user.id, is_premium: false, premium_expires_at: null, role: "USER" as const }) : null;
  const accessProfile = resource.access_type === "PREMIUM" ? await scopeProfileToSubject(base, resource.subject_id) : base;
  if (canAccessResource(accessProfile, resource)) return { ok: true };
  if (!user) return { ok: false, status: 401, code: "LOGIN_REQUIRED", message: "Please sign in to view this resource." };
  return { ok: false, status: 403, code: "PREMIUM_REQUIRED", message: "This resource needs IOE Connect Premium for this program." };
}
