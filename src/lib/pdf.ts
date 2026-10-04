import "server-only";

import { PDFDocument } from "pdf-lib";
import { getSetting } from "@/lib/settings";

const MB = 1024 * 1024;

export const PDF_MIME_TYPES = ["application/pdf", "application/x-pdf"] as const;

export type PdfValidation =
  | { ok: true; pageCount: number; encrypted: boolean; warnings: string[] }
  | { ok: false; code: "EMPTY" | "TOO_LARGE" | "BAD_MIME" | "NOT_PDF" | "TRUNCATED" | "UNREADABLE"; message: string };

/** Admin-configured upload limit (site_settings.resources.max_upload_mb), in bytes. */
export async function getMaxUploadBytes(): Promise<number> {
  const s = await getSetting("resources");
  return Math.max(1, s.max_upload_mb) * MB;
}

/** `%PDF-` magic bytes within the first 1 KB (some generators prepend junk). */
export function hasPdfMagic(buf: Uint8Array): boolean {
  const head = Buffer.from(buf.buffer, buf.byteOffset, Math.min(buf.byteLength, 1024)).toString("latin1");
  return head.indexOf("%PDF-") !== -1;
}

/** `%%EOF` near the end: catches truncated uploads. */
export function hasPdfEof(buf: Uint8Array): boolean {
  const len = buf.byteLength;
  const tail = Buffer.from(buf.buffer, buf.byteOffset + Math.max(0, len - 2048), Math.min(len, 2048)).toString("latin1");
  return tail.includes("%%EOF");
}

/**
 * Count pages with pdf-lib. Falls back to a conservative regex count (with a
 * warning) when pdf-lib cannot parse the document. Returns null if nothing
 * sensible can be determined.
 */
export async function getPdfPageCount(buf: Uint8Array): Promise<{ pageCount: number | null; encrypted: boolean; parsedBy: "pdf-lib" | "regex" | null }> {
  try {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    return { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted, parsedBy: "pdf-lib" };
  } catch {
    const text = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString("latin1");
    const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    const encrypted = /\/Encrypt\s/.test(text);
    return matches?.length ? { pageCount: matches.length, encrypted, parsedBy: "regex" } : { pageCount: null, encrypted, parsedBy: null };
  }
}

/**
 * Validate an uploaded PDF: non-empty, size limit, mime type, magic bytes,
 * trailer present, parseable page count.
 */
export async function validatePdf(
  buf: Uint8Array,
  { mimeType, maxBytes }: { mimeType?: string | null; maxBytes: number },
): Promise<PdfValidation> {
  if (!buf.byteLength) return { ok: false, code: "EMPTY", message: "The file is empty." };
  if (buf.byteLength > maxBytes) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `The file is ${(buf.byteLength / MB).toFixed(1)} MB; the upload limit is ${(maxBytes / MB).toFixed(0)} MB.`,
    };
  }
  const mime = (mimeType ?? "").toLowerCase().split(";")[0].trim();
  // Some browsers send an empty type or octet-stream for PDFs; magic bytes are authoritative.
  if (mime && mime !== "application/octet-stream" && !(PDF_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, code: "BAD_MIME", message: "Only PDF files can be uploaded." };
  }
  if (!hasPdfMagic(buf)) return { ok: false, code: "NOT_PDF", message: "This file is not a valid PDF." };

  const warnings: string[] = [];
  if (!hasPdfEof(buf)) {
    return {
      ok: false,
      code: "TRUNCATED",
      message: "The PDF appears to be incomplete (no end-of-file marker). Re-export or re-upload it.",
    };
  }

  const { pageCount, encrypted, parsedBy } = await getPdfPageCount(buf);
  if (!pageCount) {
    return { ok: false, code: "UNREADABLE", message: "Could not read the pages of this PDF. It may be damaged." };
  }
  if (parsedBy === "regex") warnings.push("The PDF structure is irregular; the page count is an estimate.");
  if (encrypted) warnings.push("The PDF is encrypted. It will only display if it has no open password.");
  return { ok: true, pageCount, encrypted, warnings };
}

/**
 * Safe file name for storage/metadata: strips paths, control and reserved
 * characters, collapses whitespace, limits length and forces a .pdf extension.
 */
export function sanitizeFileName(name: string | null | undefined, fallback = "document"): string {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  let cleaned = base
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
  cleaned = cleaned.replace(/\.pdf$/i, "");
  if (!cleaned) cleaned = fallback;
  if (cleaned.length > 120) cleaned = cleaned.slice(0, 120).trim();
  return `${cleaned}.pdf`;
}

/** Page range map, e.g. { "2079": [1, 4], "2080": [5, 9] }. */
export type YearPageRanges = Record<string, [number, number]>;

/**
 * Check year_page_ranges against the document's page count.
 * Returns a list of human-readable problems (empty = valid).
 */
export function checkYearPageRanges(ranges: YearPageRanges, pageCount: number): string[] {
  const problems: string[] = [];
  for (const [year, [start, end]] of Object.entries(ranges)) {
    if (start < 1 || end < start) problems.push(`${year}: pages ${start}-${end} is not a valid range.`);
    else if (end > pageCount) problems.push(`${year}: page ${end} is beyond the last page (${pageCount}).`);
  }
  return problems;
}
