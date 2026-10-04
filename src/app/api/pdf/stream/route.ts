import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getProfile, getSessionUser } from "@/lib/auth";
import { decideAccess, loadStoredResource } from "@/lib/pdf-access";
import { getPdfBytes } from "@/lib/pdf-cache";
import { jsonError, NO_STORE_HEADERS } from "@/lib/pdf-http";
import { contentRangeHeader, parseRangeHeader, unsatisfiedRangeHeader } from "@/lib/pdf-range";
import { verifyPdfToken } from "@/lib/pdf-token";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET|HEAD /api/pdf/stream
 * Token: `X-PDF-Token` header (preferred, used by the viewer) or `?t=` query.
 * Re-checks on every request (with a ~30 s per token+session cache) that the
 * cookie session is the token's user and is still authorized.
 * Supports single `Range: bytes=` requests (206 / 416).
 */

const AUTHZ_CACHE_MS = 30_000;
const authzCache = new Map<string, { fileId: string; expires: number }>();

function authzKey(token: string, req: NextRequest): string {
  const sb = req.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `${c.name}=${c.value}`)
    .join(";");
  return createHash("sha256").update(token).update("\u0000").update(sb).digest("base64url");
}

const BINARY_HEADERS: Record<string, string> = {
  ...NO_STORE_HEADERS,
  "Content-Type": "application/pdf",
  "Content-Disposition": "inline",
  "Accept-Ranges": "bytes",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Robots-Tag": "noindex, nofollow",
  Vary: "Cookie, X-PDF-Token, Range",
};

type Authorized = { ok: true; fileId: string } | { ok: false; res: Response };

async function authorize(req: NextRequest): Promise<Authorized> {
  const token = req.headers.get("x-pdf-token") ?? req.nextUrl.searchParams.get("t");
  const payload = verifyPdfToken(token);
  if (!token || !payload) {
    return { ok: false, res: jsonError(401, "TOKEN_INVALID", "Your viewing session expired. Reloading…") };
  }

  const key = authzKey(token, req);
  const now = Date.now();
  const cached = authzCache.get(key);
  if (cached && cached.expires > now) return { ok: true, fileId: cached.fileId };

  const user = await getSessionUser();
  if ((payload.userId ?? null) !== (user?.id ?? null)) {
    return { ok: false, res: jsonError(401, "SESSION_MISMATCH", "Your sign-in changed. Please reload the page.") };
  }
  const [profile, resource] = await Promise.all([getProfile(), loadStoredResource(payload.resourceId)]);
  if (!resource) return { ok: false, res: jsonError(404, "NOT_FOUND", "This resource is not available.") };
  const decision = await decideAccess(user, profile, resource);
  if (!decision.ok) return { ok: false, res: jsonError(decision.status, decision.code, decision.message) };
  if (!resource.fileId) return { ok: false, res: jsonError(409, "NOT_READY", "This file is still being processed.") };

  if (authzCache.size > 5000) {
    for (const [k, v] of authzCache) if (v.expires <= now) authzCache.delete(k);
    if (authzCache.size > 5000) authzCache.clear();
  }
  authzCache.set(key, { fileId: resource.fileId, expires: Math.min(now + AUTHZ_CACHE_MS, payload.exp * 1000) });
  return { ok: true, fileId: resource.fileId };
}

async function handle(req: NextRequest, withBody: boolean): Promise<Response> {
  let auth: Authorized;
  try {
    auth = await authorize(req);
  } catch (err) {
    console.error("[pdf/stream] authorization failed", err);
    return jsonError(500, "SERVER_ERROR", "Could not open this file right now.");
  }
  if (!auth.ok) return auth.res;

  let bytes: Buffer;
  try {
    bytes = await getPdfBytes(auth.fileId);
  } catch (err) {
    console.error("[pdf/stream] storage fetch failed", err instanceof Error ? `${err.name}: ${err.message}` : err);
    return jsonError(502, "STORAGE_UNAVAILABLE", "The file could not be loaded right now. Please try again.");
  }

  const size = bytes.byteLength;
  const range = parseRangeHeader(req.headers.get("range"), size);

  if (range.kind === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...BINARY_HEADERS, "Content-Range": unsatisfiedRangeHeader(size), "Content-Length": "0" },
    });
  }

  const start = range.kind === "partial" ? range.start : 0;
  const end = range.kind === "partial" ? range.end : size - 1;
  const length = size === 0 ? 0 : end - start + 1;
  const headers: Record<string, string> = { ...BINARY_HEADERS, "Content-Length": String(length) };
  if (range.kind === "partial") headers["Content-Range"] = contentRangeHeader(start, end, size);

  // Copy the slice so the response never holds a view into the shared cache buffer.
  const body = withBody && length > 0 ? new Uint8Array(bytes.subarray(start, end + 1)) : null;
  return new Response(body, { status: range.kind === "partial" ? 206 : 200, headers });
}

export async function GET(req: NextRequest) {
  return handle(req, true);
}

export async function HEAD(req: NextRequest) {
  return handle(req, false);
}
