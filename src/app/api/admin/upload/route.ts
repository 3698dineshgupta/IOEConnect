import { revalidateTag } from "next/cache";
import { after, type NextRequest } from "next/server";
import { getProfile, getSessionUser, isAdmin } from "@/lib/auth";
import { checkYearPageRanges, getMaxUploadBytes, sanitizeFileName, validatePdf } from "@/lib/pdf";
import { isSameOrigin, jsonError, NO_STORE_HEADERS } from "@/lib/pdf-http";
import {
  beginUpload,
  createUploadSchema,
  formToObject,
  loadExistingResource,
  replaceUploadSchema,
  runUploadPipeline,
  subjectExists,
  takeUploadToken,
  UploadError,
  type CreateUploadInput,
  type PipelineInput,
  type ReplaceUploadInput,
  type UploadEvent,
  type UploadResult,
} from "@/lib/pdf-upload";

export const runtime = "nodejs";
export const maxDuration = 300;

const MB = 1024 * 1024;
const RESOURCES_TAG = "resources";

/**
 * POST /api/admin/upload  (multipart/form-data)
 * See ./README.md for the full contract and NDJSON stream format.
 */
export async function POST(req: NextRequest) {
  // --- authn / authz (JSON errors, never redirects) ----------------------------
  if (!isSameOrigin(req)) return jsonError(403, "FORBIDDEN", "Cross-site request rejected.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in again.");
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return jsonError(403, "FORBIDDEN", "Only admins can upload resources.");
  const adminId = profile.id;

  // --- size pre-check before reading the body ----------------------------------
  const maxBytes = await getMaxUploadBytes();
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes + 2 * MB) {
    return jsonError(413, "FILE_TOO_LARGE", `The upload limit is ${Math.round(maxBytes / MB)} MB.`);
  }

  // --- rate limit ----------------------------------------------------------------
  const rl = takeUploadToken(adminId);
  if (!rl.ok) {
    const res = jsonError(429, "RATE_LIMITED", rl.reason, { retryAfter: rl.retryAfterSec });
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  // --- parse multipart -----------------------------------------------------------
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error("[upload] multipart parse failed", err instanceof Error ? err.message : err);
    return jsonError(
      400,
      "BAD_FORM",
      "The upload could not be read. If the file is larger than 10 MB, the server's request body limit may be too low (see upload README).",
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "FILE_REQUIRED", "Choose a PDF file to upload.");

  const raw = formToObject(form);
  const isReplace = typeof raw.resource_id === "string" && raw.resource_id.length > 0;
  const parsed = isReplace ? replaceUploadSchema.safeParse(raw) : createUploadSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ field: i.path.join(".") || "form", message: i.message }));
    return jsonError(400, "VALIDATION_FAILED", issues[0] ? `${issues[0].field}: ${issues[0].message}` : "Invalid form.", { issues });
  }
  const data = parsed.data;

  // --- referenced rows -------------------------------------------------------------
  let existing: Awaited<ReturnType<typeof loadExistingResource>> = null;
  try {
    if (isReplace) {
      existing = await loadExistingResource((data as { resource_id: string }).resource_id);
      if (!existing) return jsonError(404, "RESOURCE_NOT_FOUND", "The resource to replace was not found.");
      if (existing.status === "PROCESSING") {
        return jsonError(409, "RESOURCE_BUSY", "This resource is still processing a previous upload.");
      }
    }
    if (data.subject_id && !(await subjectExists(data.subject_id))) {
      return jsonError(400, "VALIDATION_FAILED", "subject_id: Subject not found.", {
        issues: [{ field: "subject_id", message: "Subject not found." }],
      });
    }
  } catch (err) {
    console.error("[upload] lookup failed", err);
    return jsonError(500, "SERVER_ERROR", "Could not start the upload. Please try again.");
  }

  // --- validate PDF ------------------------------------------------------------------
  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validatePdf(buffer, { mimeType: file.type, maxBytes });
  if (!validation.ok) {
    return jsonError(validation.code === "TOO_LARGE" ? 413 : 400, `PDF_${validation.code}`, validation.message);
  }
  if (data.year_page_ranges) {
    const problems = checkYearPageRanges(data.year_page_ranges, validation.pageCount);
    if (problems.length) {
      return jsonError(400, "VALIDATION_FAILED", `year_page_ranges: ${problems[0]}`, {
        issues: problems.map((message) => ({ field: "year_page_ranges", message })),
      });
    }
  }

  const fileName = sanitizeFileName(file.name);
  const wantsStream = req.nextUrl.searchParams.get("stream") !== "0";

  const release = beginUpload(adminId);
  const mode: PipelineInput["mode"] =
    isReplace && existing
      ? { kind: "replace", data: data as ReplaceUploadInput, existing }
      : { kind: "create", data: data as CreateUploadInput };
  const run = (emit: (e: UploadEvent) => void) =>
    runUploadPipeline({
      adminId,
      file: buffer,
      fileName,
      pageCount: validation.pageCount,
      validationWarnings: validation.warnings,
      mode,
      emit,
    });

  // Revalidation must run inside after(): tags added once the handler has returned are otherwise dropped.
  let settle!: (r: UploadResult | null) => void;
  const settled = new Promise<UploadResult | null>((r) => (settle = r));
  after(async () => {
    const result = await settled;
    if (result) revalidateTag(RESOURCES_TAG, { expire: 0 });
  });

  if (!wantsStream) {
    try {
      const result = await run(() => {});
      settle(result);
      return Response.json(result, { headers: NO_STORE_HEADERS });
    } catch (err) {
      settle(null);
      return errorJson(err);
    } finally {
      release();
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: UploadEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          closed = true; // client went away; keep processing so the DB ends consistent
        }
      };
      const ping = setInterval(() => emit({ type: "ping" }), 10_000);
      emit({
        type: "stage",
        stage: "validated",
        pageCount: validation.pageCount,
        originalSize: buffer.byteLength,
        warnings: validation.warnings,
      });
      try {
        const result = await run(emit);
        settle(result);
        emit({ type: "result", result });
      } catch (err) {
        settle(null);
        const e = toUploadError(err);
        emit({ type: "error", stage: e.stage, code: e.code, message: e.message, resourceId: e.resourceId });
      } finally {
        clearInterval(ping);
        release();
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

function toUploadError(err: unknown): UploadError {
  if (err instanceof UploadError) return err;
  console.error("[upload] unexpected failure", err);
  return new UploadError("saving", "SERVER_ERROR", "Something went wrong while processing the upload.");
}

function errorJson(err: unknown): Response {
  const e = toUploadError(err);
  const status = e.code === "FILE_TOO_LARGE_FOR_STORAGE" ? 413 : e.stage === "uploading" ? 502 : 500;
  return jsonError(status, e.code, e.message, { stage: e.stage, resourceId: e.resourceId });
}
