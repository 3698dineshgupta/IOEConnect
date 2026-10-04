import "server-only";

import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { compressPdf } from "@/lib/ilovepdf";
import { UUID_RE } from "@/lib/pdf-access";
import { invalidatePdfBytes } from "@/lib/pdf-cache";
import { checkYearPageRanges, getPdfPageCount, hasPdfMagic, type YearPageRanges } from "@/lib/pdf";
import { getSetting } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteTelegramMessage, telegramMaxDownloadBytes, TelegramError, uploadPdfToTelegram } from "@/lib/telegram";
import { ACCESS_TYPES, RESOURCE_TYPES, type ResourceStatus } from "@/lib/types";

const MB = 1024 * 1024;
/** Only PDFs larger than this are sent to iLovePDF for compression. */
const COMPRESS_MIN_BYTES = 20 * MB;

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------
const uuid = z.string().trim().regex(UUID_RE, "Invalid id");
const year = z.number().int().min(1950).max(2200);
const yearKey = z.string().regex(/^\d{4}$/, "Year keys must be 4-digit years");
const pageRange = z.tuple([z.number().int().min(1), z.number().int().min(1)]).refine(([a, b]) => a <= b, "Start page must be <= end page");

const metadataSchema = z.object({
  subject_id: uuid,
  resource_type: z.enum(RESOURCE_TYPES),
  access_type: z.enum(ACCESS_TYPES),
  title: z.string().trim().min(2, "Title is too short").max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  available_years: z.array(year).max(100).optional(),
  year_page_ranges: z.record(yearKey, pageRange).optional(),
  exam_type: z.string().trim().max(60).nullable().optional(),
});

export const createUploadSchema = metadataSchema;
export const replaceUploadSchema = metadataSchema.partial().extend({ resource_id: uuid });

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
export type ReplaceUploadInput = z.infer<typeof replaceUploadSchema>;

function parseJsonish(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/**
 * Turn multipart fields into a plain object for zod. Accepts:
 *   available_years: repeated fields, a JSON array, or "2079,2080"
 *   year_page_ranges: JSON object string
 *   empty strings => undefined (or null for description/exam_type)
 */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : undefined;
  };
  for (const k of ["resource_id", "subject_id", "resource_type", "access_type", "title"] as const) {
    const v = str(k)?.trim();
    if (v) out[k] = v;
  }
  for (const k of ["description", "exam_type"] as const) {
    const v = str(k);
    if (v !== undefined) out[k] = v.trim() === "" ? null : v;
  }

  const years = form.getAll("available_years").filter((v): v is string => typeof v === "string");
  if (years.length) {
    let list: unknown[] = [];
    for (const y of years) {
      const parsed = parseJsonish(y.trim());
      if (Array.isArray(parsed)) list.push(...parsed);
      else if (typeof parsed === "number") list.push(parsed);
      else if (typeof parsed === "string") list.push(...parsed.split(",").map((s) => s.trim()).filter(Boolean));
    }
    list = list.map((x) => (typeof x === "string" && /^\d+$/.test(x) ? Number(x) : x));
    out.available_years = list;
  }

  const ranges = str("year_page_ranges")?.trim();
  if (ranges) out.year_page_ranges = parseJsonish(ranges);
  return out;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory token bucket per admin + concurrency cap)
// ---------------------------------------------------------------------------
const BUCKET_CAPACITY = 60;
const REFILL_PER_MS = 60 / (10 * 60 * 1000); // 60 uploads per 10 minutes
const MAX_CONCURRENT = 2;
const buckets = new Map<string, { tokens: number; updated: number }>();
const active = new Map<string, number>();

export function takeUploadToken(adminId: string): { ok: true } | { ok: false; retryAfterSec: number; reason: string } {
  const now = Date.now();
  if ((active.get(adminId) ?? 0) >= MAX_CONCURRENT) {
    return { ok: false, retryAfterSec: 10, reason: `At most ${MAX_CONCURRENT} uploads can run at the same time.` };
  }
  const b = buckets.get(adminId) ?? { tokens: BUCKET_CAPACITY, updated: now };
  b.tokens = Math.min(BUCKET_CAPACITY, b.tokens + (now - b.updated) * REFILL_PER_MS);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(adminId, b);
    return { ok: false, retryAfterSec: Math.ceil((1 - b.tokens) / REFILL_PER_MS / 1000), reason: "Too many uploads. Please wait a moment." };
  }
  b.tokens -= 1;
  buckets.set(adminId, b);
  return { ok: true };
}

export function beginUpload(adminId: string): () => void {
  active.set(adminId, (active.get(adminId) ?? 0) + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const n = (active.get(adminId) ?? 1) - 1;
    if (n <= 0) active.delete(adminId);
    else active.set(adminId, n);
  };
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export type UploadStage = "validated" | "compressed" | "uploaded" | "saved";

export type UploadEvent =
  | { type: "stage"; stage: "validated"; pageCount: number; originalSize: number; warnings: string[] }
  | {
      type: "stage";
      stage: "compressed";
      compressionStatus: "compressed" | "fallback_original" | "skipped";
      originalSize: number;
      compressedSize: number;
      savedPercent: number;
      warning?: string;
    }
  | { type: "stage"; stage: "uploaded" }
  | { type: "stage"; stage: "saved"; resourceId: string; status: ResourceStatus }
  | { type: "result"; result: UploadResult }
  | { type: "error"; stage: "compressing" | "uploading" | "saving"; code: string; message: string; resourceId?: string }
  | { type: "ping" };

export interface UploadResult {
  resourceId: string;
  replaced: boolean;
  status: ResourceStatus;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  compressionStatus: "compressed" | "fallback_original" | "skipped";
  warnings: string[];
  pageCount: number;
}

export class UploadError extends Error {
  constructor(
    readonly stage: "compressing" | "uploading" | "saving",
    readonly code: string,
    message: string,
    readonly resourceId?: string,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface PipelineInput {
  adminId: string;
  file: Buffer;
  fileName: string;
  pageCount: number;
  validationWarnings: string[];
  mode: { kind: "create"; data: CreateUploadInput } | { kind: "replace"; data: ReplaceUploadInput; existing: ExistingResource };
  emit: (e: UploadEvent) => void;
}

export interface ExistingResource {
  id: string;
  status: ResourceStatus;
  telegram_file_id: string | null;
  telegram_message_id: number | null;
  year_page_ranges: YearPageRanges | null;
  available_years: number[] | null;
}

export async function loadExistingResource(id: string): Promise<ExistingResource | null> {
  const { data, error } = await createAdminClient()
    .from("resources")
    .select("id, status, telegram_file_id, telegram_message_id, year_page_ranges, available_years")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`resource lookup failed: ${error.message}`);
  return (data as ExistingResource | null) ?? null;
}

export async function subjectExists(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("subjects").select("id").eq("id", id).maybeSingle();
  if (error) throw new Error(`subject lookup failed: ${error.message}`);
  return Boolean(data);
}

function savedPercent(original: number, final: number): number {
  if (original <= 0 || final >= original) return 0;
  return Math.round((1 - final / original) * 1000) / 10;
}

/** Derive available_years from range keys when not given explicitly. */
function yearsFrom(data: { available_years?: number[]; year_page_ranges?: YearPageRanges }): number[] | undefined {
  if (data.available_years?.length) return [...new Set(data.available_years)].sort((a, b) => a - b);
  if (data.year_page_ranges && Object.keys(data.year_page_ranges).length) {
    return Object.keys(data.year_page_ranges).map(Number).sort((a, b) => a - b);
  }
  return data.available_years;
}

/**
 * compress -> Telegram upload -> DB row (create: PROCESSING -> PUBLISHED,
 * FAILED on error; replace: row updated only after the new file is stored).
 * Emits stage events. Throws UploadError on failure (after cleanup).
 */
export async function runUploadPipeline(input: PipelineInput): Promise<UploadResult> {
  const { adminId, file, fileName, pageCount, emit, mode } = input;
  const warnings = [...input.validationWarnings];
  const admin = createAdminClient();
  const originalSize = file.byteLength;

  // --- 1. create PROCESSING row (create mode) --------------------------------
  let resourceId: string;
  if (mode.kind === "create") {
    const d = mode.data;
    const { data, error } = await admin
      .from("resources")
      .insert({
        subject_id: d.subject_id,
        title: d.title,
        description: d.description ?? null,
        resource_type: d.resource_type,
        access_type: d.access_type,
        original_file_name: fileName,
        file_size: originalSize,
        page_count: pageCount,
        available_years: yearsFrom(d) ?? [],
        year_page_ranges: d.year_page_ranges ?? {},
        exam_type: d.exam_type ?? null,
        uploaded_by: adminId,
        status: "PROCESSING",
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[upload] insert failed", error?.message);
      throw new UploadError("saving", "DB_INSERT_FAILED", "Could not create the resource record.");
    }
    resourceId = (data as { id: string }).id;
  } else {
    resourceId = mode.existing.id;
  }

  const markFailed = async () => {
    if (mode.kind !== "create") return;
    const { error } = await admin.from("resources").update({ status: "FAILED" }).eq("id", resourceId);
    if (error) console.error("[upload] could not mark FAILED", error.message);
  };

  // --- 2. compress -------------------------------------------------------------
  let finalBytes: Buffer = file;
  let compressionStatus: UploadResult["compressionStatus"] = "fallback_original";
  let compressionWarning: string | undefined;
  const settings = await getSetting("resources");
  if (!settings.compress_pdfs) {
    compressionWarning = "Compression is disabled in settings; the original file was stored.";
  } else if (originalSize <= COMPRESS_MIN_BYTES) {
    // Small files are stored untouched: no warning, this is the normal case.
    compressionStatus = "skipped";
  } else {
    const r = await compressPdf(file, { fileName, level: "recommended" });
    if (!r.ok) {
      compressionWarning = `Compression failed (${r.reason}); the original file was stored.`;
    } else if (r.compressedSize >= originalSize) {
      compressionWarning = "Compression did not reduce the size; the original file was stored.";
    } else if (!hasPdfMagic(r.data)) {
      compressionWarning = "Compressed output was invalid; the original file was stored.";
    } else {
      const check = await getPdfPageCount(r.data);
      if (check.pageCount !== pageCount) {
        compressionWarning = `Compressed file had ${check.pageCount ?? "unknown"} pages instead of ${pageCount}; the original file was stored.`;
      } else {
        finalBytes = r.data;
        compressionStatus = "compressed";
      }
    }
  }
  if (compressionWarning) warnings.push(compressionWarning);
  const compressedSize = finalBytes.byteLength;
  const saved = savedPercent(originalSize, compressedSize);
  emit({ type: "stage", stage: "compressed", compressionStatus, originalSize, compressedSize, savedPercent: saved, warning: compressionWarning });

  const maxServe = telegramMaxDownloadBytes();
  if (compressedSize > maxServe) {
    await markFailed();
    throw new UploadError(
      "uploading",
      "FILE_TOO_LARGE_FOR_STORAGE",
      `The stored file would be ${(compressedSize / MB).toFixed(1)} MB, but Telegram bots can only serve files up to ${(maxServe / MB).toFixed(0)} MB. Split the PDF into smaller parts and upload them separately.`,
      mode.kind === "create" ? resourceId : undefined,
    );
  }

  // --- 3. Telegram upload --------------------------------------------------------
  let tg: { file_id: string; message_id: number };
  try {
    tg = await uploadPdfToTelegram(finalBytes, fileName, `IOE Connect resource ${resourceId}`);
  } catch (err) {
    await markFailed();
    const tgErr = err instanceof TelegramError ? err : null;
    console.error("[upload] telegram upload failed", tgErr ? `${tgErr.code}: ${tgErr.message}` : err);
    throw new UploadError(
      "uploading",
      tgErr?.code === "TOO_LARGE" ? "FILE_TOO_LARGE_FOR_STORAGE" : tgErr?.code === "CONFIG" ? "STORAGE_NOT_CONFIGURED" : "STORAGE_UPLOAD_FAILED",
      tgErr?.code === "TOO_LARGE" || tgErr?.code === "CONFIG" ? tgErr.message : "Uploading to file storage failed. Please try again.",
      mode.kind === "create" ? resourceId : undefined,
    );
  }
  emit({ type: "stage", stage: "uploaded" });

  // --- 4. Save row -------------------------------------------------------------
  let status: ResourceStatus;
  let update: Record<string, unknown>;
  if (mode.kind === "create") {
    status = "PUBLISHED";
    update = {
      telegram_file_id: tg.file_id,
      telegram_message_id: tg.message_id,
      compressed_file_size: compressedSize,
      status,
    };
  } else {
    const d = mode.data;
    const ex = mode.existing;
    status = ex.status === "FAILED" || ex.status === "PROCESSING" ? "PUBLISHED" : ex.status;
    update = {
      telegram_file_id: tg.file_id,
      telegram_message_id: tg.message_id,
      original_file_name: fileName,
      file_size: originalSize,
      compressed_file_size: compressedSize,
      page_count: pageCount,
      status,
    };
    for (const k of ["subject_id", "title", "resource_type", "access_type", "description", "exam_type"] as const) {
      if (d[k] !== undefined) update[k] = d[k];
    }
    if (d.year_page_ranges !== undefined) update.year_page_ranges = d.year_page_ranges;
    const years = yearsFrom(d);
    if (years !== undefined) update.available_years = years;
    if (d.year_page_ranges === undefined && ex.year_page_ranges) {
      const problems = checkYearPageRanges(ex.year_page_ranges, pageCount);
      if (problems.length) warnings.push(`Existing year page ranges no longer fit the new file: ${problems.join(" ")}`);
    }
  }

  const { error: upErr } = await admin.from("resources").update(update).eq("id", resourceId);
  if (upErr) {
    console.error("[upload] row update failed", upErr.message);
    await deleteTelegramMessage(tg.message_id);
    await markFailed();
    throw new UploadError("saving", "DB_UPDATE_FAILED", "The file was processed but the record could not be saved.", mode.kind === "create" ? resourceId : undefined);
  }
  emit({ type: "stage", stage: "saved", resourceId, status });

  // --- 5. Replace cleanup ----------------------------------------------------------
  if (mode.kind === "replace") {
    invalidatePdfBytes(mode.existing.telegram_file_id);
    if (mode.existing.telegram_message_id && mode.existing.telegram_message_id !== tg.message_id) {
      const deleted = await deleteTelegramMessage(mode.existing.telegram_message_id);
      if (!deleted) warnings.push("The previous file could not be removed from storage (Telegram only allows deleting messages newer than 48 hours). It is no longer used.");
    }
  }

  await logAudit({
    adminId,
    action: "resource.upload",
    targetType: "resource",
    targetId: resourceId,
    metadata: {
      replaced: mode.kind === "replace",
      title: mode.kind === "create" ? mode.data.title : (mode.data.title ?? undefined),
      original_size: originalSize,
      compressed_size: compressedSize,
      compression_status: compressionStatus,
      page_count: pageCount,
      status,
    },
  });

  return {
    resourceId,
    replaced: mode.kind === "replace",
    status,
    originalSize,
    compressedSize,
    savedPercent: saved,
    compressionStatus,
    warnings,
    pageCount,
  };
}
