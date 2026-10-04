// Client-only helpers for the secure viewer: token lifecycle + pdf.js loading
// through a custom range transport, so the short-lived token travels only in a
// request header (never in a URL) and can be refreshed mid-session.
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { parseContentRange } from "@/lib/pdf-range";

type PdfjsModule = typeof import("pdfjs-dist");

/** Bytes fetched per range request (also pdf.js rangeChunkSize). */
export const CHUNK_SIZE = 256 * 1024;

export class PdfAccessError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "PdfAccessError";
  }
}

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/** Lazy-load pdf.js in the browser and point it at the bundled worker (same version). */
export function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
      .then((m) => {
        if (!m.GlobalWorkerOptions.workerSrc) {
          m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        }
        return m;
      })
      .catch((err) => {
        pdfjsPromise = null;
        throw err;
      });
  }
  return pdfjsPromise;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function readError(res: Response): Promise<{ code: string; message: string }> {
  try {
    const j = (await res.json()) as { code?: string; error?: { code?: string; message?: string } };
    return { code: j.error?.code ?? j.code ?? `HTTP_${res.status}`, message: j.error?.message ?? "Could not load this file." };
  } catch {
    return { code: `HTTP_${res.status}`, message: "Could not load this file." };
  }
}

/** Holds the viewing token for one resource and fetches byte ranges with it. */
export class PdfSession {
  private token: string | null = null;
  private expiresAt = 0;
  private pending: Promise<string> | null = null;
  private issued = 0;

  constructor(readonly resourceId: string) {}

  /** Valid token, refreshed when it is about to expire (or when `force`). */
  getToken(force = false): Promise<string> {
    if (!force && this.token && this.expiresAt - Date.now() > 30_000) return Promise.resolve(this.token);
    if (!this.pending) {
      this.pending = this.fetchToken(this.issued > 0).finally(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  /** Milliseconds until the current token should be refreshed (for timers). */
  msUntilRefresh(): number {
    return Math.max(5_000, this.expiresAt - Date.now() - 45_000);
  }

  private async fetchToken(refresh: boolean): Promise<string> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response;
      try {
        res = await fetch(`/api/pdf/${encodeURIComponent(this.resourceId)}/token`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refresh }),
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch (err) {
        lastErr = err;
        await sleep(600 * 2 ** attempt);
        continue;
      }
      if (res.ok) {
        const j = (await res.json()) as { token: string; ttl: number };
        this.token = j.token;
        this.expiresAt = Date.now() + Math.max(30, j.ttl) * 1000;
        this.issued++;
        return j.token;
      }
      const e = await readError(res);
      if (res.status >= 500 && attempt < 2) {
        lastErr = new PdfAccessError(e.code, e.message, res.status);
        await sleep(600 * 2 ** attempt);
        continue;
      }
      throw new PdfAccessError(e.code, e.message, res.status);
    }
    throw lastErr instanceof PdfAccessError ? lastErr : new PdfAccessError("NETWORK", "Network error. Check your connection.");
  }

  /** Fetch bytes [begin, end) through the stream endpoint. */
  async fetchRange(
    begin: number,
    end: number,
    signal?: AbortSignal,
  ): Promise<{ data: Uint8Array; total: number | null; partial: boolean }> {
    let refreshed = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const token = await this.getToken();
      let res: Response;
      try {
        res = await fetch("/api/pdf/stream", {
          headers: { "X-PDF-Token": token, Range: `bytes=${begin}-${Math.max(begin, end - 1)}` },
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });
      } catch (err) {
        if (signal?.aborted) throw err;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (res.status === 206 || res.status === 200) {
        const data = new Uint8Array(await res.arrayBuffer());
        const cr = parseContentRange(res.headers.get("content-range"));
        return { data, total: cr ? cr.total : data.byteLength, partial: res.status === 206 };
      }
      const e = await readError(res);
      if (res.status === 401 && e.code === "TOKEN_INVALID" && !refreshed) {
        refreshed = true;
        await this.getToken(true);
        continue;
      }
      if (res.status >= 500 && res.status !== 501) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      throw new PdfAccessError(e.code, e.message, res.status);
    }
    throw new PdfAccessError("NETWORK", "The connection was interrupted while loading the file.");
  }
}

export interface OpenedPdf {
  task: PDFDocumentLoadingTask;
  doc: PDFDocumentProxy;
}

/**
 * Open the document: one initial range request tells us the size; pdf.js then
 * pulls further chunks on demand (disableAutoFetch) via `requestDataRange`.
 */
export async function openPdf(
  session: PdfSession,
  { onTransportError, signal }: { onTransportError: (err: unknown) => void; signal: AbortSignal },
): Promise<OpenedPdf> {
  const pdfjs = await loadPdfjs();
  await session.getToken();
  const first = await session.fetchRange(0, CHUNK_SIZE, signal);
  // Runtime assets are served from /public/pdfjs (see scripts/copy-pdfjs-assets.mjs). Without
  // wasmUrl, scanned PDFs (JPEG2000 / JBIG2 images) render as blank pages.
  const common = {
    enableXfa: false,
    isOffscreenCanvasSupported: true,
    wasmUrl: "/pdfjs/wasm/",
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    iccUrl: "/pdfjs/iccs/",
  } as const;

  let task: PDFDocumentLoadingTask;
  if (!first.partial || first.total == null || first.data.byteLength >= first.total) {
    task = pdfjs.getDocument({ ...common, data: first.data });
  } else {
    const controller = new AbortController();
    signal.addEventListener("abort", () => controller.abort(), { once: true });

    class TokenRangeTransport extends pdfjs.PDFDataRangeTransport {
      requestDataRange(begin: number, end: number) {
        session
          .fetchRange(begin, end, controller.signal)
          .then((r) => this.onDataRange(begin, r.data))
          .catch((err) => {
            if (!controller.signal.aborted) onTransportError(err);
          });
      }
      abort() {
        controller.abort();
        super.abort();
      }
    }

    const transport = new TokenRangeTransport(first.total, first.data);
    task = pdfjs.getDocument({
      ...common,
      range: transport,
      rangeChunkSize: CHUNK_SIZE,
      disableAutoFetch: true,
      disableStream: true,
    });
  }

  signal.addEventListener("abort", () => void task.destroy(), { once: true });
  const doc = await task.promise;
  return { task, doc };
}
