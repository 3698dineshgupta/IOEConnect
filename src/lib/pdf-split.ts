/**
 * Split a PDF into parts that are each at most `maxBytes`, by contiguous page ranges.
 * Pure (pdf-lib only, no DOM / Node APIs) so it runs in the browser and in Node tests.
 *
 * Telegram bot storage can only serve files up to 20 MB, so the admin bulk uploader splits any
 * PDF above SPLIT_ABOVE into parts of at most MAX_PART and uploads each part as its own resource.
 */
import { PDFDocument } from "pdf-lib";

export { MAX_PART, SPLIT_ABOVE, estimateParts } from "./pdf-split-limits";

const MiB = 1024 * 1024;

export const SPLIT_FAILED_MESSAGE = "This PDF is password protected / damaged and could not be split.";

export class PdfSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfSplitError";
  }
}

export interface SplitProgress {
  /** Parts finished so far. */
  done: number;
  /** Current estimate of the total number of parts (can grow when a part has to be halved). */
  total: number;
}

export interface SplitResult {
  parts: Uint8Array[];
  /** 1-based inclusive page range of each part. [1, 0] when a whole file was returned without being parsed. */
  pageRanges: [number, number][];
}

/** Let the browser paint / handle input between heavy steps. */
const yieldToLoop = () => new Promise<void>((r) => setTimeout(r, 0));

async function loadSource(bytes: Uint8Array): Promise<PDFDocument> {
  let src: PDFDocument;
  try {
    src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  } catch {
    throw new PdfSplitError(SPLIT_FAILED_MESSAGE);
  }
  // Encrypted streams would be copied still encrypted (unreadable), so refuse.
  if (src.isEncrypted) throw new PdfSplitError(SPLIT_FAILED_MESSAGE);
  if (src.getPageCount() < 1) throw new PdfSplitError(SPLIT_FAILED_MESSAGE);
  return src;
}

async function buildPart(src: PDFDocument, [from, to]: [number, number]): Promise<Uint8Array> {
  const out = await PDFDocument.create({ updateMetadata: false });
  const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
  for (const p of await out.copyPages(src, indices)) out.addPage(p);
  return out.save({ useObjectStreams: true });
}

/** `n` pages into `k` contiguous groups balanced by page count. */
function balancedRanges(n: number, k: number): [number, number][] {
  const out: [number, number][] = [];
  let start = 1;
  for (let i = 0; i < k; i++) {
    const size = Math.floor(n / k) + (i < n % k ? 1 : 0);
    out.push([start, start + size - 1]);
    start += size;
  }
  return out;
}

const mb = (b: number) => `${(b / MiB).toFixed(1)} MB`;

/**
 * Split `bytes` into parts of at most `opts.maxBytes`. A PDF already within the limit is returned whole.
 * Estimates K = ceil(size / (maxBytes * 0.85)) groups of pages; any part still too big is halved
 * recursively. Throws PdfSplitError for encrypted / damaged files or when one page alone is too big.
 */
export async function splitPdfBySize(bytes: Uint8Array, opts: { maxBytes: number; onProgress?: (p: SplitProgress) => void }): Promise<SplitResult> {
  const { maxBytes, onProgress } = opts;
  if (bytes.byteLength <= maxBytes) return { parts: [bytes], pageRanges: [[1, 0]] };

  const src = await loadSource(bytes);
  const n = src.getPageCount();
  const k = Math.min(n, Math.max(1, Math.ceil(bytes.byteLength / (maxBytes * 0.85))));
  return splitRanges(src, balancedRanges(n, k), maxBytes, onProgress);
}

/**
 * Re-create parts for known page ranges (used to resume an interrupted upload with exactly the same
 * parts). Ranges that come out too big are still halved.
 */
export async function splitPdfByRanges(bytes: Uint8Array, ranges: [number, number][], opts: { maxBytes: number; onProgress?: (p: SplitProgress) => void }): Promise<SplitResult> {
  const src = await loadSource(bytes);
  const n = src.getPageCount();
  if (!ranges.length || ranges.some(([a, b]) => a < 1 || b < a || b > n)) throw new PdfSplitError("The PDF changed since it was split. Remove it and add it again.");
  return splitRanges(src, ranges, opts.maxBytes, opts.onProgress);
}

async function splitRanges(src: PDFDocument, initial: [number, number][], maxBytes: number, onProgress?: (p: SplitProgress) => void): Promise<SplitResult> {
  const parts: Uint8Array[] = [];
  const pageRanges: [number, number][] = [];
  let total = initial.length;
  const queue = [...initial];
  onProgress?.({ done: 0, total });
  while (queue.length) {
    const range = queue.shift()!;
    await yieldToLoop();
    const part = await buildPart(src, range);
    if (part.byteLength <= maxBytes) {
      parts.push(part);
      pageRanges.push(range);
      onProgress?.({ done: parts.length, total });
      continue;
    }
    const [a, b] = range;
    if (a === b) throw new PdfSplitError(`Page ${a} alone is ${mb(part.byteLength)}, over the ${mb(maxBytes)} part limit, so this PDF cannot be split small enough. Compress it first.`);
    const mid = Math.floor((a + b) / 2);
    queue.unshift([a, mid], [mid + 1, b]);
    total += 1;
    onProgress?.({ done: parts.length, total });
  }
  return { parts, pageRanges };
}
