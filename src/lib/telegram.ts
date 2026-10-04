import "server-only";

/**
 * Telegram Bot API storage backend for PDFs.
 *
 * Files are uploaded to a private chat/channel (TELEGRAM_STORAGE_CHAT_ID) with
 * `sendDocument` and later fetched server-side via `getFile`. The bot token,
 * file ids and download URLs NEVER leave the server and are never logged.
 *
 * Bot API limits (cloud api.telegram.org):
 *   - upload via multipart: 50 MB
 *   - download via getFile: 20 MB  <- files larger than this cannot be served
 * A self-hosted Bot API server (TELEGRAM_API_BASE) raises these limits; set
 * TELEGRAM_MAX_UPLOAD_MB / TELEGRAM_MAX_DOWNLOAD_MB accordingly.
 */

const MB = 1024 * 1024;

export class TelegramError extends Error {
  /** Stable machine code, safe to show to admins. */
  readonly code: "CONFIG" | "TOO_LARGE" | "API" | "NETWORK" | "NOT_FOUND";
  /** Whether a retry could help. */
  readonly retryable: boolean;
  constructor(code: TelegramError["code"], message: string, retryable = false) {
    super(message);
    this.name = "TelegramError";
    this.code = code;
    this.retryable = retryable;
  }
}

interface TgConfig {
  token: string;
  chatId: string;
  base: string;
}

function config(): TgConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID?.trim();
  if (!token || !chatId) {
    throw new TelegramError("CONFIG", "Telegram storage is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID).");
  }
  const base = (process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org").replace(/\/+$/, "");
  return { token, chatId, base };
}

function envMb(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v * MB) : fallback * MB;
}

/** Max bytes `sendDocument` accepts. */
export function telegramMaxUploadBytes(): number {
  return envMb("TELEGRAM_MAX_UPLOAD_MB", 50);
}

/** Max bytes `getFile` can serve back. Stored PDFs must not exceed this. */
export function telegramMaxDownloadBytes(): number {
  return envMb("TELEGRAM_MAX_DOWNLOAD_MB", 20);
}

/** Remove the bot token from any string before it can reach logs/errors. */
function redact(s: string, token: string): string {
  return token ? s.split(token).join("<redacted>") : s;
}

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number): number {
  // 0.8s, 1.6s, 3.2s ... capped, with jitter
  return Math.min(8000, 800 * 2 ** attempt) + Math.floor(Math.random() * 300);
}

/**
 * Call a Bot API method with retries (429 retry_after, 5xx, network errors).
 * `body` is a factory so multipart bodies can be rebuilt for each attempt.
 */
async function callApi<T>(
  method: string,
  body: () => FormData | Record<string, unknown>,
  { attempts = 4, timeoutMs = 60_000 }: { attempts?: number; timeoutMs?: number } = {},
): Promise<T> {
  const { token, base } = config();
  const url = `${base}/bot${token}/${method}`;
  let lastErr: TelegramError | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      const b = body();
      const isForm = b instanceof FormData;
      res = await fetch(url, {
        method: "POST",
        body: isForm ? b : JSON.stringify(b),
        headers: isForm ? undefined : { "content-type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "Error";
      lastErr = new TelegramError(
        "NETWORK",
        name === "TimeoutError" ? `Telegram ${method} timed out` : `Telegram ${method} network error`,
        true,
      );
      if (attempt < attempts - 1) await sleep(backoffMs(attempt));
      continue;
    }

    if (res.status === 413) {
      throw new TelegramError("TOO_LARGE", "File is too large for the Telegram Bot API (max 50 MB per upload).");
    }

    let json: TgResponse<T> | null = null;
    try {
      json = (await res.json()) as TgResponse<T>;
    } catch {
      json = null;
    }

    if (res.ok && json?.ok && json.result !== undefined) return json.result;

    const description = redact(json?.description ?? `HTTP ${res.status}`, token);
    const code = json?.error_code ?? res.status;

    if (code === 429) {
      const wait = Math.min(30, json?.parameters?.retry_after ?? 2) * 1000;
      lastErr = new TelegramError("API", `Telegram rate limited ${method}`, true);
      if (attempt < attempts - 1) await sleep(wait + 250);
      continue;
    }
    if (code >= 500) {
      lastErr = new TelegramError("API", `Telegram ${method} failed (${code})`, true);
      if (attempt < attempts - 1) await sleep(backoffMs(attempt));
      continue;
    }
    if (code === 413 || /too big|too large/i.test(description)) {
      throw new TelegramError("TOO_LARGE", `Telegram rejected the file as too large: ${description}`);
    }
    if (/file not found|wrong file_id|file_id/i.test(description) && method === "getFile") {
      throw new TelegramError("NOT_FOUND", "Stored file was not found on Telegram.");
    }
    // 400/401/403 etc.: not retryable (bad token, bot not in chat, ...)
    throw new TelegramError("API", `Telegram ${method} failed (${code}): ${description}`);
  }
  throw lastErr ?? new TelegramError("API", `Telegram ${method} failed`);
}

interface TgMessage {
  message_id: number;
  document?: { file_id: string; file_unique_id: string; file_size?: number; file_name?: string };
}

export interface TelegramUploadResult {
  file_id: string;
  message_id: number;
}

/**
 * Upload a PDF to the private storage chat.
 * @param fileName stored on Telegram only (never shown to users)
 */
export async function uploadPdfToTelegram(
  data: Buffer | Uint8Array,
  fileName: string,
  caption?: string,
): Promise<TelegramUploadResult> {
  const max = telegramMaxUploadBytes();
  if (data.byteLength > max) {
    throw new TelegramError(
      "TOO_LARGE",
      `File is ${(data.byteLength / MB).toFixed(1)} MB; the Telegram Bot API accepts at most ${(max / MB).toFixed(0)} MB per upload.`,
    );
  }
  const { chatId } = config();
  // Copy into a fresh ArrayBuffer-backed view so Blob accepts it regardless of the source buffer type.
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  const msg = await callApi<TgMessage>(
    "sendDocument",
    () => {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("disable_notification", "true");
      form.set("disable_content_type_detection", "true");
      if (caption) form.set("caption", caption.slice(0, 1000));
      form.set("document", new Blob([bytes], { type: "application/pdf" }), fileName || "document.pdf");
      return form;
    },
    { attempts: 4, timeoutMs: 180_000 },
  );
  if (!msg.document?.file_id) {
    throw new TelegramError("API", "Telegram did not return a document for the uploaded file.");
  }
  return { file_id: msg.document.file_id, message_id: msg.message_id };
}

interface TgFile {
  file_id: string;
  file_size?: number;
  file_path?: string;
}

// getFile paths are valid for at least one hour; cache them briefly.
const filePathCache = new Map<string, { path: string; size: number | null; expires: number }>();
const FILE_PATH_TTL_MS = 50 * 60 * 1000;

async function resolveFilePath(fileId: string): Promise<{ path: string; size: number | null }> {
  const hit = filePathCache.get(fileId);
  if (hit && hit.expires > Date.now()) return hit;
  const file = await callApi<TgFile>("getFile", () => ({ file_id: fileId }), { attempts: 3, timeoutMs: 20_000 });
  if (!file.file_path) {
    throw new TelegramError(
      "TOO_LARGE",
      "Telegram cannot serve this file (likely larger than the 20 MB Bot API download limit).",
    );
  }
  const entry = { path: file.file_path, size: file.file_size ?? null, expires: Date.now() + FILE_PATH_TTL_MS };
  if (filePathCache.size > 500) filePathCache.clear();
  filePathCache.set(fileId, entry);
  return entry;
}

/**
 * Open a download stream for a stored file. The Telegram URL is used only
 * here, server-side. Returns the body stream and size (if known).
 */
export async function openTelegramFileStream(
  fileId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<{ stream: ReadableStream<Uint8Array>; size: number | null }> {
  const { token, base } = config();
  const max = telegramMaxDownloadBytes();
  let lastErr: TelegramError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { path, size } = await resolveFilePath(fileId);
    if (size != null && size > max) {
      throw new TelegramError("TOO_LARGE", "Stored file exceeds the Telegram download limit.");
    }
    let res: Response;
    try {
      const timeout = AbortSignal.timeout(120_000);
      res = await fetch(`${base}/file/bot${token}/${path}`, {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        cache: "no-store",
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = new TelegramError("NETWORK", "Telegram file download network error", true);
      await sleep(backoffMs(attempt));
      continue;
    }
    if (res.ok && res.body) {
      const len = Number(res.headers.get("content-length"));
      return { stream: res.body, size: Number.isFinite(len) && len > 0 ? len : size };
    }
    await res.body?.cancel().catch(() => {});
    if (res.status === 404 || res.status === 400) {
      // path may have expired: drop cache and retry once with a fresh getFile
      filePathCache.delete(fileId);
      lastErr = new TelegramError("NOT_FOUND", "Telegram file path expired or not found", attempt === 0);
      if (attempt > 0) break;
      continue;
    }
    lastErr = new TelegramError("API", `Telegram file download failed (${res.status})`, res.status >= 500);
    if (res.status < 500 && res.status !== 429) break;
    await sleep(backoffMs(attempt));
  }
  throw lastErr ?? new TelegramError("API", "Telegram file download failed");
}

/** Download a stored file fully into memory (bounded by the download limit). */
export async function downloadTelegramFile(fileId: string, { signal }: { signal?: AbortSignal } = {}): Promise<Buffer> {
  const max = telegramMaxDownloadBytes();
  const { stream } = await openTelegramFileStream(fileId, { signal });
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => {});
        throw new TelegramError("TOO_LARGE", "Stored file exceeds the Telegram download limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/**
 * Delete a storage message (best effort; Telegram may refuse to delete
 * messages older than 48h). Returns true on success, never throws.
 */
export async function deleteTelegramMessage(messageId: number | null | undefined): Promise<boolean> {
  if (!messageId) return false;
  try {
    const { chatId } = config();
    await callApi<boolean>("deleteMessage", () => ({ chat_id: chatId, message_id: messageId }), { attempts: 2, timeoutMs: 15_000 });
    return true;
  } catch (err) {
    console.warn("[telegram] deleteMessage failed", { messageId, error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}

/**
 * Send an image with an HTML caption to the admin chat (TELEGRAM_ADMIN_CHAT_ID, falling back to the
 * storage chat) so admins can review a payment. Never throws: a failed notification must not fail
 * the user's submission. Returns whether it was delivered.
 */
export async function sendAdminPhoto(
  image: Uint8Array,
  mimeType: string,
  captionHtml: string,
): Promise<boolean> {
  try {
    const { chatId: storageChat } = config();
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || storageChat;
    const bytes = new Uint8Array(image.byteLength);
    bytes.set(image);
    const send = (method: "sendPhoto" | "sendDocument", field: "photo" | "document") =>
      callApi<TgMessage>(
        method,
        () => {
          const form = new FormData();
          form.set("chat_id", chatId);
          form.set("parse_mode", "HTML");
          form.set("caption", captionHtml.slice(0, 1024));
          form.set(field, new Blob([bytes], { type: mimeType }), "payment-screenshot");
          return form;
        },
        { attempts: 3, timeoutMs: 60_000 },
      );
    try {
      await send("sendPhoto", "photo");
    } catch {
      // Unsupported image shape for sendPhoto (e.g. odd dimensions): send as a file instead.
      await send("sendDocument", "document");
    }
    return true;
  } catch (err) {
    console.warn("[telegram] admin notification failed", { error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}

/** Whether Telegram storage env vars are present (does not call the API). */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_STORAGE_CHAT_ID?.trim());
}
