"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { REQUEST_STATUSES, RESOURCE_TYPES } from "@/lib/types";
import { buildAdminNote, parseAdminNote, type ActionResult } from "@/components/community/common";
import { GENERIC_ERROR, NOT_ALLOWED, NOT_SIGNED_IN, getAdminProfile, isUuid, rateLimitDb } from "@/components/community/guards";

const MAX_OPEN = 15;

const createSchema = z
  .object({
    subjectId: z.string().optional().default(""),
    subjectText: z.string().trim().max(200, "Subject name is too long.").optional().default(""),
    resourceType: z.enum(RESOURCE_TYPES, { message: "Please choose what you need." }),
    years: z.string().trim().max(100, "Years: please keep it short.").optional().default(""),
    message: z.string().trim().max(1500, "Message is too long (max 1500).").optional().default(""),
  })
  .refine((v) => isUuid(v.subjectId) || v.subjectText.length >= 2, {
    message: "Choose a subject or type its name.",
    path: ["subjectText"],
  });

export async function createResourceRequest(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  const settings = await getSetting("resources");
  if (!settings.allow_requests) return { ok: false, error: "Resource requests are currently turned off." };
  if (!(await rateLimitDb(`request:${user.id}`, 10, 60 * 60 * 1000))) {
    return { ok: false, error: "You are sending requests too fast. Please try again later." };
  }

  try {
    const supabase = await createServerClient();
    const { count } = await supabase
      .from("resource_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["PENDING", "IN_PROGRESS"]);
    if ((count ?? 0) >= MAX_OPEN) {
      return { ok: false, error: "You already have many open requests. Please wait for some to be completed." };
    }

    let subjectId: string | null = null;
    if (isUuid(d.subjectId)) {
      const { data: subject } = await supabase.from("subjects").select("id").eq("id", d.subjectId).maybeSingle();
      if (!subject) return { ok: false, error: "That subject does not exist." };
      subjectId = subject.id as string;
    }

    const { error } = await supabase.from("resource_requests").insert({
      user_id: user.id,
      subject_id: subjectId,
      subject_text: subjectId ? null : d.subjectText,
      resource_type: d.resourceType,
      years: d.years || null,
      message: d.message || null,
    });
    if (error) {
      console.error("[requests] insert failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    revalidatePath("/my-requests");
    return { ok: true };
  } catch (err) {
    console.error("[requests] create failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function cancelOwnRequest(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { data: row } = await supabase
      .from("resource_requests")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return { ok: false, error: "Request not found." };
    if (row.status !== "PENDING") return { ok: false, error: "Only pending requests can be cancelled." };
    const { error } = await supabase.from("resource_requests").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      console.error("[requests] cancel failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    revalidatePath("/my-requests");
    return { ok: true };
  } catch (err) {
    console.error("[requests] cancel failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const adminUpdateSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: z.string().trim().max(1000, "Note is too long (max 1000).").optional().default(""),
  /** Optional: published resource to link when completing. */
  resourceId: z.string().optional().default(""),
});

/**
 * Admin: update status + note. The schema has no resource_id column on
 * resource_requests, so a linked resource is stored as a trailing marker in
 * admin_note (see parseAdminNote) and rendered as a link for the requester.
 */
export async function updateResourceRequest(id: string, input: unknown): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = adminUpdateSchema.safeParse(input);
  if (!parsed.success || !isUuid(id)) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Invalid request." };
  const d = parsed.data;
  if (d.status === "REJECTED" && !d.note) return { ok: false, error: "Please add a note explaining the rejection." };

  try {
    const supabase = await createServerClient();
    let link: { subjectSlug: string; title: string } | null = null;
    if (!d.resourceId) {
      // Keep an existing link unless the admin explicitly removes it ("none").
      const { data: existing } = await supabase.from("resource_requests").select("admin_note").eq("id", id).maybeSingle();
      link = parseAdminNote(existing?.admin_note as string | null).resource;
    } else if (d.resourceId !== "none") {
      if (!isUuid(d.resourceId)) return { ok: false, error: "Invalid resource." };
      const { data: res } = await supabase
        .from("public_resources")
        .select("title, subject_slug")
        .eq("id", d.resourceId)
        .maybeSingle();
      if (!res) return { ok: false, error: "Linked resource not found or not published." };
      link = { subjectSlug: res.subject_slug as string, title: res.title as string };
    }
    // A link only makes sense for completed requests.
    if (d.status !== "COMPLETED") link = null;
    const note = buildAdminNote(parseAdminNote(d.note).text, link);
    const { error } = await supabase.from("resource_requests").update({ status: d.status, admin_note: note }).eq("id", id);
    if (error) {
      console.error("[requests] admin update failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({
      adminId: admin.id,
      action: "request.update",
      targetType: "resource_request",
      targetId: id,
      metadata: { status: d.status, linked_resource: d.status === "COMPLETED" ? d.resourceId || null : null },
    });
    revalidatePath("/admin/requests");
    revalidatePath("/my-requests");
    return { ok: true };
  } catch (err) {
    console.error("[requests] admin update failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteResourceRequest(id: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("resource_requests").delete().eq("id", id);
    if (error) {
      console.error("[requests] delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({ adminId: admin.id, action: "request.delete", targetType: "resource_request", targetId: id });
    revalidatePath("/admin/requests");
    return { ok: true };
  } catch (err) {
    console.error("[requests] delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
