import "server-only";

import { headers } from "next/headers";
import { getProfile, getSessionUser, isAdmin } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export const NOT_SIGNED_IN = "Please sign in to continue.";
export const NOT_ALLOWED = "You are not allowed to do that.";
export const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Admin profile for server actions, or null (never redirects; callers return a friendly error). */
export async function getAdminProfile(): Promise<Profile | null> {
  const profile = await getProfile();
  return profile && isAdmin(profile) ? profile : null;
}

export async function getUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim() || "unknown";
  } catch {
    return "unknown";
  }
}

// Simple in-memory sliding-window limiter (per server instance; best-effort).
const buckets = new Map<string, number[]>();

/** Returns true if the action is allowed, false when the key exceeded `limit` within `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}
