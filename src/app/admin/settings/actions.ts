"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import type { SettingKey, SettingsMap } from "@/lib/types";
import { SETTING_KEYS } from "@/lib/types";
import { assertAdmin, zodMessage, type ActionResult } from "@/components/admin/guard";

/** Validates with the shared zod schema inside setSetting; the first issue comes back as the error message. */
export async function saveSettingAction<K extends SettingKey>(key: K, value: SettingsMap[K]): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  if (!(SETTING_KEYS as readonly string[]).includes(key)) return { ok: false, error: "Unknown setting." };
  const res = await setSetting(key, value);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/admin/settings");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Premium plans
// ---------------------------------------------------------------------------
const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Plan name is required").max(80),
  price: z.number().min(0, "Price cannot be negative").max(10_000_000),
  duration_days: z.number().int().min(1, "Duration must be at least 1 day").max(3650),
  description: z.string().trim().max(500).nullable(),
  benefits: z.array(z.string().trim().min(1).max(200)).max(20),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(1000),
});
export type PlanInput = z.input<typeof planSchema>;

export async function savePlanAction(input: PlanInput): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = planSchema.safeParse(input);
  if (!p.success) return { ok: false, error: zodMessage(p.error) };
  const { id, ...fields } = p.data;
  const supabase = await createServerClient();
  const q = id
    ? supabase.from("premium_plans").update(fields).eq("id", id).select("id").maybeSingle()
    : supabase.from("premium_plans").insert(fields).select("id").maybeSingle();
  const { data, error } = await q;
  if (error || !data) {
    console.error("[admin/settings] plan save failed", error);
    return { ok: false, error: "Could not save the plan. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: id ? "plan.update" : "plan.create", targetType: "premium_plan", targetId: (data as { id: string }).id, metadata: { name: fields.name, price: fields.price } });
  revalidateTag("settings", { expire: 0 });
  revalidatePath("/admin/settings");
  revalidatePath("/premium");
  return { ok: true };
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.string().uuid().safeParse(id);
  if (!p.success) return { ok: false, error: "Invalid plan." };
  const supabase = await createServerClient();
  const { error } = await supabase.from("premium_plans").delete().eq("id", p.data);
  if (error) {
    console.error("[admin/settings] plan delete failed", error);
    // Plans referenced by payments cannot be deleted; guide the admin to deactivate instead.
    return { ok: false, error: "This plan could not be deleted. If it has payments, mark it inactive instead." };
  }
  await logAudit({ adminId: auth.profile.id, action: "plan.delete", targetType: "premium_plan", targetId: p.data });
  revalidatePath("/admin/settings");
  revalidatePath("/premium");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Payment QR images (site-assets bucket)
// ---------------------------------------------------------------------------
const QR_MAX_BYTES = 900_000;
const QR_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadQrAction(formData: FormData): Promise<ActionResult<{ path: string; url: string | null }>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const methodId = String(formData.get("method_id") ?? "");
  const file = formData.get("file");
  if (!/^[a-z0-9_-]{1,32}$/.test(methodId)) return { ok: false, error: "Save the payment method with a valid id first." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  const ext = QR_TYPES[file.type];
  if (!ext) return { ok: false, error: "QR images must be PNG, JPG or WebP." };
  if (file.size > QR_MAX_BYTES) return { ok: false, error: "QR images must be under 900 KB." };

  const path = `payment/${methodId}-${Date.now()}.${ext}`;
  const supabase = await createServerClient();
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[admin/settings] QR upload failed", error);
    return { ok: false, error: "Could not upload the image. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: "settings.qr_upload", targetType: "site-assets", targetId: path, metadata: { method: methodId } });
  const { data } = await createAdminClient().storage.from("site-assets").createSignedUrl(path, 3600);
  return { ok: true, data: { path, url: data?.signedUrl ?? null } };
}
