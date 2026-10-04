import "server-only";

import { createHmac } from "node:crypto";

/**
 * iLovePDF REST API: compress flow.
 *   auth -> start/compress -> upload -> process (compression_level) -> download -> delete task
 * Never throws: every failure returns { ok: false, reason } so the caller can
 * fall back to the original file and surface a warning to the admin.
 *
 * Env: ILOVEPDF_PUBLIC_KEY (required), ILOVEPDF_SECRET_KEY (optional; when set
 * the JWT is self-signed locally like the official SDKs, otherwise it is
 * obtained from POST /v1/auth with the public key).
 */

const API = "https://api.ilovepdf.com/v1";

export type CompressionLevel = "low" | "recommended" | "extreme";

export type CompressResult =
  | { ok: true; data: Buffer; originalSize: number; compressedSize: number }
  | { ok: false; reason: string };

let cachedToken: { token: string; expires: number } | null = null;

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function selfSignedToken(publicKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "HS256" }));
  const payload = b64url(
    JSON.stringify({ iss: "", aud: "", iat: now - 30, nbf: now - 30, exp: now + 3600, jti: publicKey }),
  );
  const sig = createHmac("sha256", secretKey).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY?.trim();
  const secretKey = process.env.ILOVEPDF_SECRET_KEY?.trim();
  if (!publicKey) throw new Error("iLovePDF is not configured (ILOVEPDF_PUBLIC_KEY missing)");

  if (secretKey) {
    const token = selfSignedToken(publicKey, secretKey);
    cachedToken = { token, expires: Date.now() + 50 * 60 * 1000 };
    return token;
  }

  const res = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ public_key: publicKey }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!res.ok || !json?.token) throw new Error(`iLovePDF auth failed (HTTP ${res.status})`);
  cachedToken = { token: json.token, expires: Date.now() + 90 * 60 * 1000 };
  return json.token;
}

async function apiJson<T>(url: string, init: RequestInit, token: string, timeoutMs: number): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) cachedToken = null;
    let detail = "";
    try {
      const j = JSON.parse(text) as { error?: { message?: string; type?: string } };
      detail = j.error?.message ?? j.error?.type ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return JSON.parse(text) as T;
}

/** Whether iLovePDF credentials are present. */
export function isIlovepdfConfigured(): boolean {
  return Boolean(process.env.ILOVEPDF_PUBLIC_KEY?.trim());
}

/**
 * Compress a PDF via iLovePDF. Returns { ok:false } on any failure (missing
 * keys, quota exhausted, network, invalid output, ...).
 */
export async function compressPdf(
  input: Buffer,
  { fileName = "document.pdf", level = "recommended" }: { fileName?: string; level?: CompressionLevel } = {},
): Promise<CompressResult> {
  if (!isIlovepdfConfigured()) return { ok: false, reason: "iLovePDF is not configured" };

  let server: string | null = null;
  let task: string | null = null;
  let token: string | null = null;
  const timeoutMs = Math.max(60_000, Math.ceil(input.byteLength / (1024 * 1024)) * 6_000);

  try {
    token = await getToken();

    const start = await apiJson<{ server: string; task: string; remaining_files?: number }>(
      `${API}/start/compress`,
      { method: "GET" },
      token,
      20_000,
    );
    if (!start.server || !start.task || !/^[a-z0-9.-]+$/i.test(start.server)) {
      return { ok: false, reason: "iLovePDF did not return a task server" };
    }
    server = start.server;
    task = start.task;
    const base = `https://${server}/v1`;

    const bytes = new Uint8Array(input.byteLength);
    bytes.set(input);
    const form = new FormData();
    form.set("task", task);
    form.set("file", new Blob([bytes], { type: "application/pdf" }), fileName);
    const uploaded = await apiJson<{ server_filename: string }>(`${base}/upload`, { method: "POST", body: form }, token, timeoutMs);
    if (!uploaded.server_filename) return { ok: false, reason: "iLovePDF upload returned no file reference" };

    const processed = await apiJson<{ status?: string; output_filesize?: number; output_filenumber?: number }>(
      `${base}/process`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          tool: "compress",
          compression_level: level,
          files: [{ server_filename: uploaded.server_filename, filename: fileName }],
          ignore_errors: false,
        }),
      },
      token,
      timeoutMs,
    );
    if (processed.status && !/^tasksuccess$/i.test(processed.status)) {
      return { ok: false, reason: `iLovePDF processing status: ${processed.status}` };
    }

    const res = await fetch(`${base}/download/${encodeURIComponent(task)}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `iLovePDF download failed (HTTP ${res.status})` };
    const data = Buffer.from(await res.arrayBuffer());

    if (data.byteLength < 5 || data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return { ok: false, reason: "iLovePDF returned something that is not a PDF" };
    }
    return { ok: true, data, originalSize: input.byteLength, compressedSize: data.byteLength };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    const reason = (err as { name?: string })?.name === "TimeoutError" ? "iLovePDF request timed out" : `iLovePDF error: ${msg}`;
    console.error("[ilovepdf] compress failed", reason);
    return { ok: false, reason };
  } finally {
    // Best-effort cleanup of the remote task (files are auto-deleted by iLovePDF after ~2h anyway).
    if (server && task && token) {
      fetch(`https://${server}/v1/task/${encodeURIComponent(task)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }
  }
}
