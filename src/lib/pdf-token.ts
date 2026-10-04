import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, HMAC-SHA256 signed tokens authorizing one user to stream one
 * resource. Format: base64url(JSON payload) + "." + base64url(signature).
 */
export interface PdfTokenPayload {
  resourceId: string;
  /** null for anonymous viewers of FREE resources */
  userId: string | null;
  /** Expiry, unix seconds */
  exp: number;
  /** Issued at, unix seconds */
  iat: number;
}

const DEFAULT_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 3600;
const VERSION = 1;

function secret(): Buffer {
  const s = process.env.PDF_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error("PDF_TOKEN_SECRET is missing or too short (need >= 32 chars)");
  }
  return Buffer.from(s, "utf8");
}

function sign(data: string): Buffer {
  return createHmac("sha256", secret()).update(data).digest();
}

/** Create a signed token. `ttl` in seconds (default 300, max 3600). */
export function signPdfToken({
  resourceId,
  userId,
  ttl = DEFAULT_TTL_SECONDS,
}: {
  resourceId: string;
  userId: string | null;
  ttl?: number;
}): string {
  if (!resourceId) throw new Error("resourceId required");
  const now = Math.floor(Date.now() / 1000);
  const life = Math.min(Math.max(Math.floor(ttl) || DEFAULT_TTL_SECONDS, 1), MAX_TTL_SECONDS);
  const body = {
    v: VERSION,
    r: resourceId,
    u: userId,
    iat: now,
    exp: now + life,
    n: randomBytes(8).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

/** Verify signature + expiry. Returns the payload, or null if invalid/expired. */
export function verifyPdfToken(token: string | null | undefined): PdfTokenPayload | null {
  if (!token || typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  let expected: Buffer;
  try {
    expected = sign(payload);
  } catch (err) {
    console.error("[pdf-token] cannot verify token", err);
    return null;
  }
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      r?: unknown;
      u?: unknown;
      iat?: unknown;
      exp?: unknown;
    };
    if (body.v !== VERSION) return null;
    if (typeof body.r !== "string" || !body.r) return null;
    if (body.u !== null && typeof body.u !== "string") return null;
    if (typeof body.exp !== "number" || typeof body.iat !== "number") return null;
    const now = Math.floor(Date.now() / 1000);
    if (body.exp <= now) return null;
    if (body.iat > now + 60) return null; // clock skew guard
    return { resourceId: body.r, userId: body.u as string | null, exp: body.exp, iat: body.iat };
  } catch {
    return null;
  }
}
