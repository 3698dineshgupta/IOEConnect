/**
 * Browser wrapper around src/lib/pdf-split.ts for the bulk uploader: splits in a module Web Worker
 * so the tab stays responsive, and falls back to the main thread (with yields between parts) when a
 * worker cannot be started.
 */
import type { SplitProgress, SplitResult } from "@/lib/pdf-split";

/** A split failure caused by the PDF itself (encrypted, damaged, a page too big). */
export class SplitFailed extends Error {}

class WorkerUnavailable extends Error {}

function inWorker(bytes: Uint8Array, maxBytes: number, ranges: [number, number][] | undefined, onProgress: (p: SplitProgress) => void): Promise<SplitResult> {
  let worker: Worker;
  try {
    worker = new Worker(new URL("./bulk-split.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return Promise.reject(new WorkerUnavailable());
  }
  return new Promise<SplitResult>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; done?: number; total?: number; parts?: Uint8Array[]; pageRanges?: [number, number][]; split?: boolean; message?: string };
      if (m.type === "progress") onProgress({ done: m.done ?? 0, total: m.total ?? 1 });
      else if (m.type === "done") resolve({ parts: m.parts ?? [], pageRanges: m.pageRanges ?? [] });
      else if (m.type === "error") reject(m.split ? new SplitFailed(m.message) : new WorkerUnavailable(m.message));
    };
    worker.onerror = (ev) => {
      ev.preventDefault();
      reject(new WorkerUnavailable(ev.message));
    };
    worker.onmessageerror = () => reject(new WorkerUnavailable());
    // Transferred, not copied (saves one full copy of a big file); the fallback re-reads the file.
    worker.postMessage({ bytes, maxBytes, ranges }, [bytes.buffer]);
  }).finally(() => worker.terminate());
}

async function onMainThread(bytes: Uint8Array, maxBytes: number, ranges: [number, number][] | undefined, onProgress: (p: SplitProgress) => void): Promise<SplitResult> {
  const lib = await import("@/lib/pdf-split");
  try {
    return ranges ? await lib.splitPdfByRanges(bytes, ranges, { maxBytes, onProgress }) : await lib.splitPdfBySize(bytes, { maxBytes, onProgress });
  } catch (e) {
    if (e instanceof lib.PdfSplitError) throw new SplitFailed(e.message);
    throw new SplitFailed(lib.SPLIT_FAILED_MESSAGE);
  }
}

/**
 * Split `file` into parts of at most `maxBytes`. With `ranges` (from an earlier split of the same file)
 * the same parts are rebuilt, so a retry can skip parts that were already uploaded.
 */
export async function splitFile(file: File, opts: { maxBytes: number; ranges?: [number, number][]; onProgress: (p: SplitProgress) => void }): Promise<SplitResult> {
  try {
    return await inWorker(new Uint8Array(await file.arrayBuffer()), opts.maxBytes, opts.ranges, opts.onProgress);
  } catch (e) {
    if (e instanceof SplitFailed) throw e;
    return onMainThread(new Uint8Array(await file.arrayBuffer()), opts.maxBytes, opts.ranges, opts.onProgress);
  }
}
