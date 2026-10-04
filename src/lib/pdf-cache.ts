import "server-only";

import { downloadTelegramFile } from "@/lib/telegram";

/**
 * Small in-memory LRU of downloaded PDF bytes keyed by Telegram file_id, so
 * the many Range requests a viewer makes do not each re-download the file.
 * Process-local (per server instance); bounded by total bytes and TTL.
 * Env: PDF_CACHE_MAX_MB (default 128), PDF_CACHE_TTL_SECONDS (default 600).
 */

const MB = 1024 * 1024;

function maxBytes(): number {
  const v = Number(process.env.PDF_CACHE_MAX_MB);
  return (Number.isFinite(v) && v >= 0 ? v : 128) * MB;
}

function ttlMs(): number {
  const v = Number(process.env.PDF_CACHE_TTL_SECONDS);
  return (Number.isFinite(v) && v > 0 ? v : 600) * 1000;
}

interface Entry {
  data: Buffer;
  expires: number;
}

// Map preserves insertion order: first key = least recently used.
const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<Buffer>>();
let totalBytes = 0;

function evict(key: string) {
  const e = entries.get(key);
  if (!e) return;
  entries.delete(key);
  totalBytes -= e.data.byteLength;
}

function put(key: string, data: Buffer) {
  const cap = maxBytes();
  if (data.byteLength > cap / 2) return; // never let one file dominate the cache
  evict(key);
  entries.set(key, { data, expires: Date.now() + ttlMs() });
  totalBytes += data.byteLength;
  while (totalBytes > cap && entries.size) {
    const oldest = entries.keys().next().value as string;
    evict(oldest);
  }
}

/** Get the full bytes for a stored file, from cache or Telegram (deduped). */
export async function getPdfBytes(fileId: string): Promise<Buffer> {
  const hit = entries.get(fileId);
  if (hit) {
    if (hit.expires > Date.now()) {
      // refresh LRU position
      entries.delete(fileId);
      entries.set(fileId, hit);
      return hit.data;
    }
    evict(fileId);
  }
  const pending = inflight.get(fileId);
  if (pending) return pending;
  const p = downloadTelegramFile(fileId)
    .then((data) => {
      put(fileId, data);
      return data;
    })
    .finally(() => inflight.delete(fileId));
  inflight.set(fileId, p);
  return p;
}

/** Drop a file from the cache (e.g. after its PDF was replaced). */
export function invalidatePdfBytes(fileId: string | null | undefined): void {
  if (fileId) evict(fileId);
}
