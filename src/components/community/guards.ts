import "server-only";

import { headers } from "next/headers";
import { getProfile, getSessionUser, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
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

/**
 * Shared rate limiter backed by the database (migration 0014), so the limit holds across serverless
 * instances. Returns true while within `limit` hits per `windowMs`. If the database function is
 * unavailable (migration not applied yet, or an outage) it falls back to the in-memory limiter, so a
 * limiter failure never blocks real users and never leaves an endpoint unlimited.
 */
export async function rateLimitDb(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (!error && typeof data === "boolean") return data;
  } catch {
    /* fall through to the in-memory limiter */
  }
  return rateLimit(key, limit, windowMs);
}
