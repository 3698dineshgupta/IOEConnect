import type { NextRequest } from "next/server";
import { canDownloadPdf } from "@/lib/access";
import { getProfile, getSessionUser } from "@/lib/auth";
import { decideAccess, loadStoredResource, UUID_RE } from "@/lib/pdf-access";
import { getPdfBytes } from "@/lib/pdf-cache";
import { scopeProfileToSubject } from "@/lib/program-premium";
import { isSameOrigin, jsonError, NO_STORE_HEADERS } from "@/lib/pdf-http";
import { stampPdf } from "@/lib/pdf-stamp";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/pdf/[resourceId]/download
 * Premium members (and admins) can download or print a PDF. Everyone else stays view-only.
 * - 401 LOGIN_REQUIRED / 403 PREMIUM_REQUIRED / 404 NOT_FOUND / 409 NOT_READY / 429 RATE_LIMITED
 * - 200 application/pdf, every page stamped with "Downloaded by <email>" so leaked copies trace back.
 * The file id never leaves the server; the session is re-checked on every request.
 */

// Per-user token bucket (best effort: per server instance). 30 downloads/prints per hour.
const CAPACITY = 30;
const REFILL_PER_MS = CAPACITY / (60 * 60 * 1000);
const buckets = new Map<string, { tokens: number; updated: number }>();

function takeToken(userId: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(userId) ?? { tokens: CAPACITY, updated: now };
  b.tokens = Math.min(CAPACITY, b.tokens + (now - b.updated) * REFILL_PER_MS);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(userId, b);
    return { ok: false, retryAfter: Math.ceil((1 - b.tokens) / REFILL_PER_MS / 1000) };
  }
  b.tokens -= 1;
  buckets.set(userId, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.updated > 3_600_000) buckets.delete(k);
  return { ok: true };
}

function fileName(title: string): { ascii: string; utf8: string } {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "IOE Connect";
  const base = `${clean}.pdf`;
  return { ascii: base.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'"), utf8: encodeURIComponent(base) };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ resourceId: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request rejected.");

  const { resourceId } = await ctx.params;
  if (!UUID_RE.test(resourceId)) return jsonError(404, "NOT_FOUND", "This resource is not available.");

  try {
    const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
    if (!user) return jsonError(401, "LOGIN_REQUIRED", "Please sign in to download.");
    const resource = await loadStoredResource(resourceId);
    if (!resource) return jsonError(404, "NOT_FOUND", "This resource is not available.");
    // Premium is per program: the buyer's program (or one sharing this subject) must match.
    if (!canDownloadPdf(await scopeProfileToSubject(profile, resource.subject_id))) {
      return jsonError(403, "PREMIUM_REQUIRED", "Downloading and printing need IOE Connect Premium for this program.");
    }
    const decision = await decideAccess(user, profile, resource);
    if (!decision.ok) return jsonError(decision.status, decision.code, decision.message);
    if (!resource.fileId) return jsonError(409, "NOT_READY", "This file is still being processed. Try again shortly.");

    const limit = takeToken(user.id);
    if (!limit.ok) {
      return jsonError(429, "RATE_LIMITED", "You've downloaded a lot recently. Please try again in a little while.", {
        retryAfter: limit.retryAfter,
      });
    }

    const original = await getPdfBytes(resource.fileId);
    const who = profile?.email ?? user.email ?? user.id;
    const label = `Downloaded by ${who} - IOE Connect - ${new Date().toISOString().slice(0, 10)}`;

    let out: Uint8Array = original;
    let stamped = "1";
    try {
      out = await stampPdf(original, label);
    } catch (err) {
      // A PDF pdf-lib can't re-write still downloads as-is; the failure is logged for the admin.
      stamped = "0";
      console.error("[pdf/download] stamping failed, serving the original", { resourceId, error: err instanceof Error ? err.message : err });
    }

    const name = fileName(resource.title);
    console.info("[pdf/download]", { resourceId, userId: user.id, bytes: out.byteLength, stamped });
    return new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Length": String(out.byteLength),
        "Content-Disposition": `attachment; filename="${name.ascii}"; filename*=UTF-8''${name.utf8}`,
        "X-Robots-Tag": "noindex, nofollow",
        "X-Stamped": stamped,
        Vary: "Cookie",
      },
    });
  } catch (err) {
    console.error("[pdf/download] failed", err instanceof Error ? `${err.name}: ${err.message}` : err);
    return jsonError(502, "STORAGE_UNAVAILABLE", "The file could not be prepared right now. Please try again.");
  }
}
