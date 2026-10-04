"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/server";
import { ACCESS_TYPES } from "@/lib/types";
import { assertAdmin, zodMessage, type ActionResult } from "@/components/admin/guard";

const uuid = z.string().uuid();

const rangeSchema = z
  .tuple([z.number().int().min(1).max(5000), z.number().int().min(1).max(5000)])
  .refine(([a, b]) => a <= b, "Start page must not be after end page");

const editSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).nullable(),
  access_type: z.enum(ACCESS_TYPES),
  available_years: z.array(z.number().int().min(1990).max(2200)).max(40),
  year_page_ranges: z.record(z.string().regex(/^\d{4}$/), rangeSchema),
  exam_type: z.string().trim().max(60).nullable(),
});
export type EditResourceInput = z.input<typeof editSchema>;

function done() {
  revalidateTag("resources", { expire: 0 });
  revalidatePath("/admin/resources");
}

export async function updateResourceAction(input: EditResourceInput): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const { id, ...fields } = parsed.data;
  // Drop ranges for years that are not selected.
  const ranges = Object.fromEntries(Object.entries(fields.year_page_ranges).filter(([y]) => fields.available_years.includes(Number(y))));
  const { error } = await createAdminClient()
    .from("resources")
    .update({ ...fields, year_page_ranges: ranges, description: fields.description || null, exam_type: fields.exam_type || null })
    .eq("id", id);
  if (error) {
    console.error("[admin/resources] update failed", error);
    return { ok: false, error: "Could not save the resource. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: "resource.update", targetType: "resource", targetId: id, metadata: { title: fields.title, access_type: fields.access_type } });
  done();
  return { ok: true };
}

export async function setResourceAccessAction(id: string, access: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, access: z.enum(ACCESS_TYPES) }).safeParse({ id, access });
  if (!p.success) return { ok: false, error: zodMessage(p.error) };
  const { error } = await createAdminClient().from("resources").update({ access_type: p.data.access }).eq("id", p.data.id);
  if (error) {
    console.error("[admin/resources] access failed", error);
    return { ok: false, error: "Could not change access. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: "resource.access_change", targetType: "resource", targetId: p.data.id, metadata: { access_type: p.data.access } });
  done();
  return { ok: true };
}

export async function moveResourceAction(id: string, subjectId: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, subjectId: uuid }).safeParse({ id, subjectId });
  if (!p.success) return { ok: false, error: "Choose a subject to move to." };
  const db = createAdminClient();
  const { data: subject } = await db.from("subjects").select("id, name").eq("id", p.data.subjectId).maybeSingle();
  if (!subject) return { ok: false, error: "That subject no longer exists." };
  const { data: before } = await db.from("resources").select("subject_id").eq("id", p.data.id).maybeSingle();
  const { error } = await db.from("resources").update({ subject_id: p.data.subjectId }).eq("id", p.data.id);
  if (error) {
    console.error("[admin/resources] move failed", error);
    return { ok: false, error: "Could not move the resource. Please try again." };
  }
  await logAudit({
    adminId: auth.profile.id,
    action: "resource.move",
    targetType: "resource",
    targetId: p.data.id,
    metadata: { from_subject_id: (before as { subject_id?: string } | null)?.subject_id ?? null, to_subject_id: p.data.subjectId },
  });
  done();
  return { ok: true };
}

export async function deleteResourceAction(id: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = uuid.safeParse(id);
  if (!p.success) return { ok: false, error: "Invalid resource." };
  const db = createAdminClient();
  const { data: row } = await db.from("resources").select("title, subject_id, resource_type").eq("id", p.data).maybeSingle();
  if (!row) return { ok: false, error: "That resource no longer exists." };
  const { error } = await db.from("resources").delete().eq("id", p.data);
  if (error) {
    console.error("[admin/resources] delete failed", error);
    return { ok: false, error: "Could not delete the resource. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: "resource.delete", targetType: "resource", targetId: p.data, metadata: row as Record<string, string> });
  done();
  return { ok: true };
}
