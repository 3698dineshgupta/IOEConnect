"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getMaxUploadBytes, sanitizeFileName, validatePdf } from "@/lib/pdf";
import { beginUpload, createUploadSchema, runUploadPipeline, takeUploadToken, UploadError } from "@/lib/pdf-upload";
import { getSetting } from "@/lib/settings";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { RESOURCE_TYPES, type StudentUpload } from "@/lib/types";
import type { ActionResult } from "@/components/community/common";
import {
  GENERIC_ERROR,
  NOT_ALLOWED,
  NOT_SIGNED_IN,
  getAdminProfile,
  isUuid,
  rateLimit,
} from "@/components/community/guards";

const BUCKET = "student-uploads";
const MAX_OPEN_PENDING = 10;

const metaSchema = z.object({
  subjectId: z.string().refine(isUuid, "Please choose a subject."),
  resourceType: z.enum(RESOURCE_TYPES, { message: "Please choose a resource type." }),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200, "Title is too long (max 200)."),
  description: z.string().trim().max(1000, "Description is too long (max 1000).").optional().default(""),
});

const submitSchema = metaSchema.extend({
  filePath: z.string().min(3).max(300),
});

// ---------------------------------------------------------------------------
// Student: submit
// ---------------------------------------------------------------------------
/** Called AFTER the browser uploaded the PDF to `<uid>/<uuid>.pdf` in the private bucket. */
export async function submitStudentUpload(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  const pathOk = new RegExp(`^${user.id}/[0-9a-f-]{36}\\.pdf$`, "i").test(d.filePath);
  if (!pathOk) return { ok: false, error: "The uploaded file could not be verified. Please try again." };

  const settings = await getSetting("resources");
  const cleanup = async () => {
    try {
      await createAdminClient().storage.from(BUCKET).remove([d.filePath]);
    } catch (err) {
      console.error("[uploads] cleanup failed", err);
    }
  };
  if (!settings.allow_student_uploads) {
    await cleanup();
    return { ok: false, error: "Student uploads are currently turned off." };
  }
  if (!rateLimit(`upload:${user.id}`, 10, 60 * 60 * 1000)) {
    await cleanup();
    return { ok: false, error: "You are uploading too fast. Please try again later." };
  }

  try {
    // The object must really exist, be a PDF and respect the configured size limit.
    const admin = createAdminClient();
    const fileName = d.filePath.split("/")[1];
    const { data: listed, error: listErr } = await admin.storage.from(BUCKET).list(user.id, { search: fileName, limit: 5 });
    const obj = listed?.find((o) => o.name === fileName);
    if (listErr || !obj) return { ok: false, error: "We could not find your uploaded file. Please try again." };
    const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
    if (size > settings.max_upload_mb * 1024 * 1024) {
      await cleanup();
      return { ok: false, error: `File is larger than ${settings.max_upload_mb} MB.` };
    }

    const supabase = await createServerClient();
    const { count } = await supabase
      .from("student_uploads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "PENDING");
    if ((count ?? 0) >= MAX_OPEN_PENDING) {
      await cleanup();
      return { ok: false, error: "You already have several uploads waiting for review. Please wait for them to be reviewed." };
    }

    const { data: subject } = await supabase.from("subjects").select("id").eq("id", d.subjectId).maybeSingle();
    if (!subject) {
      await cleanup();
      return { ok: false, error: "That subject does not exist." };
    }

    const { data, error } = await supabase
      .from("student_uploads")
      .insert({
        user_id: user.id,
        subject_id: d.subjectId,
        resource_type: d.resourceType,
        title: d.title,
        description: d.description || null,
        file_path: d.filePath,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[uploads] insert failed", error);
      await cleanup();
      return { ok: false, error: GENERIC_ERROR };
    }
    revalidatePath("/my-uploads");
    return { ok: true, id: data.id as string };
  } catch (err) {
    console.error("[uploads] submit failed", err);
    await cleanup();
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Student: withdraw an upload that is still pending. */
export async function deleteOwnUpload(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { data: row } = await supabase
      .from("student_uploads")
      .select("id, file_path, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return { ok: false, error: "Upload not found." };
    if (row.status !== "PENDING") return { ok: false, error: "Only uploads that are still pending can be withdrawn." };
    const { error } = await supabase.from("student_uploads").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("[uploads] own delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await createAdminClient().storage.from(BUCKET).remove([row.file_path as string]);
    revalidatePath("/my-uploads");
    return { ok: true };
  } catch (err) {
    console.error("[uploads] own delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
async function loadUpload(id: string): Promise<StudentUpload | null> {
  const { data } = await createAdminClient().from("student_uploads").select("*").eq("id", id).maybeSingle<StudentUpload>();
  return data ?? null;
}

/** 60-second signed URL for previewing a submitted PDF. Admin only. */
export async function getUploadPreviewUrl(id: string): Promise<ActionResult<{ url: string; expiresIn: number }>> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const row = await loadUpload(id);
    if (!row) return { ok: false, error: "Upload not found." };
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(row.file_path, 60);
    if (error || !data) {
      console.error("[uploads] signed url failed", error);
      return { ok: false, error: "The file could not be found in storage." };
    }
    return { ok: true, url: data.signedUrl, expiresIn: 60 };
  } catch (err) {
    console.error("[uploads] preview failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000, "Note is too long (max 1000).").optional().default(""),
});

export async function reviewStudentUpload(id: string, decision: string, note?: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = reviewSchema.safeParse({ decision, note });
  if (!parsed.success || !isUuid(id)) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Invalid request." };
  if (parsed.data.decision === "REJECTED" && !parsed.data.note) {
    return { ok: false, error: "Please add a short note explaining the rejection." };
  }
  try {
    const row = await loadUpload(id);
    if (!row) return { ok: false, error: "Upload not found." };
    if (row.status === "PUBLISHED") return { ok: false, error: "This upload is already published." };
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("student_uploads")
      .update({ status: parsed.data.decision, review_note: parsed.data.note || null })
      .eq("id", id);
    if (error) {
      console.error("[uploads] review failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({
      adminId: admin.id,
      action: parsed.data.decision === "APPROVED" ? "student_upload.approve" : "student_upload.reject",
      targetType: "student_upload",
      targetId: id,
      metadata: { note: parsed.data.note || null },
    });
    revalidatePath("/admin/student-uploads");
    revalidatePath("/my-uploads");
    return { ok: true };
  } catch (err) {
    console.error("[uploads] review failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateStudentUploadMeta(id: string, input: unknown): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = metaSchema.safeParse(input);
  if (!parsed.success || !isUuid(id)) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("student_uploads")
      .update({
        subject_id: parsed.data.subjectId,
        resource_type: parsed.data.resourceType,
        title: parsed.data.title,
        description: parsed.data.description || null,
      })
      .eq("id", id);
    if (error) {
      console.error("[uploads] meta failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({ adminId: admin.id, action: "student_upload.edit", targetType: "student_upload", targetId: id, metadata: { title: parsed.data.title } });
    revalidatePath("/admin/student-uploads");
    revalidatePath("/my-uploads");
    return { ok: true };
  } catch (err) {
    console.error("[uploads] meta failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteStudentUpload(id: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const row = await loadUpload(id);
    if (!row) return { ok: false, error: "Upload not found." };
    const adminClient = createAdminClient();
    const { error: rmErr } = await adminClient.storage.from(BUCKET).remove([row.file_path]);
    if (rmErr) console.error("[uploads] storage remove failed", rmErr);
    const supabase = await createServerClient();
    const { error } = await supabase.from("student_uploads").delete().eq("id", id);
    if (error) {
      console.error("[uploads] delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({
      adminId: admin.id,
      action: "student_upload.delete",
      targetType: "student_upload",
      targetId: id,
      metadata: { title: row.title, file_path: row.file_path },
    });
    revalidatePath("/admin/student-uploads");
    revalidatePath("/my-uploads");
    return { ok: true };
  } catch (err) {
    console.error("[uploads] delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Publish -> PDF pipeline adapter
// ---------------------------------------------------------------------------
/**
 * Feeds a student upload through the SAME pipeline as /api/admin/upload
 * (validate -> iLovePDF compress -> Telegram -> resources row), calling the
 * pipeline modules directly (no HTTP). The resource is created PUBLISHED with
 * the access type from site settings and uploaded_by = the publishing admin.
 *
 * NOTE: exported from a "use server" module so it is network-callable; it
 * therefore re-checks admin rights itself.
 */
export async function processUploadToResource(args: {
  upload: StudentUpload;
  bytes: Uint8Array;
}): Promise<ActionResult<{ resourceId: string }>> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const { upload, bytes } = args;
  if (!upload.subject_id) return { ok: false, error: "Choose a subject (Edit) before publishing." };

  const gate = takeUploadToken(admin.id);
  if (!gate.ok) return { ok: false, error: gate.reason };

  const buffer = Buffer.from(bytes);
  const validation = await validatePdf(buffer, { mimeType: "application/pdf", maxBytes: await getMaxUploadBytes() });
  if (!validation.ok) return { ok: false, error: validation.message };

  const settings = await getSetting("resources");
  const parsed = createUploadSchema.safeParse({
    subject_id: upload.subject_id,
    resource_type: upload.resource_type,
    access_type: settings.default_access_type,
    title: upload.title,
    description: upload.description,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload details." };

  const release = beginUpload(admin.id);
  try {
    const result = await runUploadPipeline({
      adminId: admin.id,
      file: buffer,
      fileName: sanitizeFileName(`${upload.title}.pdf`),
      pageCount: validation.pageCount,
      validationWarnings: validation.warnings,
      mode: { kind: "create", data: parsed.data },
      emit: () => {},
    });
    return { ok: true, resourceId: result.resourceId };
  } catch (err) {
    if (err instanceof UploadError) return { ok: false, error: err.message };
    console.error("[uploads] pipeline failed", err);
    return { ok: false, error: "Publishing failed. Please try again." };
  } finally {
    release();
  }
}

export async function publishStudentUpload(id: string): Promise<ActionResult<{ resourceId: string }>> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const row = await loadUpload(id);
    if (!row) return { ok: false, error: "Upload not found." };
    if (row.status === "PUBLISHED") return { ok: false, error: "This upload is already published." };
    if (row.status === "REJECTED") return { ok: false, error: "Rejected uploads cannot be published. Approve it first." };
    if (!row.subject_id) return { ok: false, error: "Choose a subject (Edit) before publishing." };

    const adminClient = createAdminClient();
    const { data: blob, error: dlErr } = await adminClient.storage.from(BUCKET).download(row.file_path);
    if (dlErr || !blob) {
      console.error("[uploads] download failed", dlErr);
      return { ok: false, error: "The file could not be read from storage." };
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const result = await processUploadToResource({ upload: row, bytes });
    if (!result.ok) return result;

    const supabase = await createServerClient();
    const { error } = await supabase
      .from("student_uploads")
      .update({ status: "PUBLISHED", resource_id: result.resourceId })
      .eq("id", id);
    if (error) console.error("[uploads] mark published failed", error);

    await logAudit({
      adminId: admin.id,
      action: "student_upload.publish",
      targetType: "student_upload",
      targetId: id,
      metadata: { resource_id: result.resourceId },
    });
    revalidateTag("resources", { expire: 0 });
    revalidatePath("/admin/student-uploads");
    revalidatePath("/my-uploads");
    return { ok: true, resourceId: result.resourceId };
  } catch (err) {
    console.error("[uploads] publish failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
