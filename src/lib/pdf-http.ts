import "server-only";

import { NextResponse } from "next/server";

/** Headers for every PDF API response (JSON or binary). */
export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: { code, message, ...extra }, code }, { status, headers: NO_STORE_HEADERS });
}

/**
 * CSRF guard for cookie-authenticated POSTs: if the browser sent an Origin
 * (or, failing that, a Referer), it must match this request's host or
 * NEXT_PUBLIC_SITE_URL. Sec-Fetch-Site=cross-site is always rejected.
 */
export function isSameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = req.headers.get("origin") ?? refererOrigin(req.headers.get("referer"));
  if (!origin) return true; // non-browser clients; cookies still required for auth
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (req.url.startsWith("https:") ? "https" : "http");
  if (host) allowed.add(`${proto}://${host}`);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      /* ignore */
    }
  }
  return allowed.has(origin);
}

function refererOrigin(ref: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).origin;
  } catch {
    return null;
  }
}
