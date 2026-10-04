/**
 * Module Web Worker that splits a PDF off the main thread (see src/lib/pdf-split.ts).
 * In:  { bytes: Uint8Array, maxBytes: number, ranges?: [number, number][] }
 * Out: { type: "progress", done, total } ... then { type: "done", parts, pageRanges } or { type: "error", split, message }
 */
import { PdfSplitError, splitPdfByRanges, splitPdfBySize, type SplitProgress } from "@/lib/pdf-split";

interface SplitRequest {
  bytes: Uint8Array;
  maxBytes: number;
  ranges?: [number, number][];
}

// Typed by hand: adding the "webworker" lib next to "dom" conflicts in this project's tsconfig.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<SplitRequest>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

ctx.onmessage = async (e: MessageEvent<SplitRequest>) => {
  const { bytes, maxBytes, ranges } = e.data;
  const onProgress = (p: SplitProgress) => ctx.postMessage({ type: "progress", ...p });
  try {
    const r = ranges ? await splitPdfByRanges(bytes, ranges, { maxBytes, onProgress }) : await splitPdfBySize(bytes, { maxBytes, onProgress });
    const buffers = [...new Set(r.parts.map((p) => p.buffer as ArrayBuffer))];
    ctx.postMessage({ type: "done", parts: r.parts, pageRanges: r.pageRanges }, buffers);
  } catch (err) {
    ctx.postMessage({ type: "error", split: err instanceof PdfSplitError, message: err instanceof Error ? err.message : String(err) });
  }
};
