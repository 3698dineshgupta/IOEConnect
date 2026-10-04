import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getSessionUser } from "@/lib/auth";
import { decideAccess, loadStoredResource, UUID_RE } from "@/lib/pdf-access";
import { isSameOrigin, jsonError, NO_STORE_HEADERS } from "@/lib/pdf-http";
import { signPdfToken } from "@/lib/pdf-token";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VIEW_COOKIE = "ioe_vk";

/**
 * POST /api/pdf/[resourceId]/token
 * Body (optional JSON): { refresh?: boolean }  -- refresh=true skips view counting
 * 200 { token, expiresAt, ttl }
 * 401 { code: "LOGIN_REQUIRED" } | 403 { code: "PREMIUM_REQUIRED" | "FORBIDDEN" } | 404 { code: "NOT_FOUND" }
 * 409 { code: "NOT_READY" } (resource has no stored file yet)
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ resourceId: string }> }) {
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request rejected.");

  const { resourceId } = await ctx.params;
  if (!UUID_RE.test(resourceId)) return jsonError(404, "NOT_FOUND", "This resource is not available.");

  let refresh = false;
  try {
    const text = await req.text();
    if (text) refresh = Boolean((JSON.parse(text) as { refresh?: unknown }).refresh === true);
  } catch {
    /* empty or invalid body: treat as initial request */
  }

  try {
    const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
    const resource = await loadStoredResource(resourceId);
    if (!resource) return jsonError(404, "NOT_FOUND", "This resource is not available.");

    const decision = await decideAccess(user, profile, resource);
    if (!decision.ok) return jsonError(decision.status, decision.code, decision.message);
    if (!resource.fileId) return jsonError(409, "NOT_READY", "This file is still being processed. Try again shortly.");

    const settings = await getSetting("resources");
    const ttl = settings.pdf_token_ttl_seconds || 300;
    const token = signPdfToken({ resourceId, userId: user?.id ?? null, ttl });
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const res = NextResponse.json({ token, expiresAt, ttl }, { headers: NO_STORE_HEADERS });

    if (!refresh && resource.status === "PUBLISHED") {
      let sessionKey: string | null = null;
      if (!user) {
        sessionKey = req.cookies.get(VIEW_COOKIE)?.value ?? null;
        if (!sessionKey || !/^[A-Za-z0-9_-]{16,64}$/.test(sessionKey)) {
          sessionKey = randomBytes(16).toString("base64url");
          res.cookies.set(VIEW_COOKIE, sessionKey, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      }
      try {
        // Cookie client so auth.uid() inside the RPC is the viewer (dedupe per user).
        const supabase = await createServerClient();
        const { error } = await supabase.rpc("record_resource_view", { p_resource_id: resourceId, p_session_key: sessionKey });
        if (error) console.error("[pdf/token] record_resource_view failed", error.message);
      } catch (err) {
        console.error("[pdf/token] record_resource_view failed", err);
      }
    }
    return res;
  } catch (err) {
    console.error("[pdf/token] failed", err);
    return jsonError(500, "SERVER_ERROR", "Could not open this file right now. Please try again.");
  }
}
