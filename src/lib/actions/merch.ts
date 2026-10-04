"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/community/common";
import { GENERIC_ERROR, NOT_ALLOWED, getAdminProfile, isUuid } from "@/components/community/guards";

const BUCKET = "merch";

function publicPrefix(): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/`;
}

function pathFromUrl(url: string): string | null {
  const prefix = publicPrefix();
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(150, "Name is too long."),
  description: z.string().trim().max(2000, "Description is too long (max 2000).").optional().default(""),
  price: z.coerce.number({ message: "Enter a valid price." }).min(0, "Price cannot be negative.").max(10_000_000, "Price is too large."),
  stock: z.coerce
    .number({ message: "Enter a valid stock." })
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative.")
    .max(1_000_000),
  isAvailable: z.boolean(),
  images: z
    .array(z.string().max(600))
    .max(8, "At most 8 images per product.")
    .refine((arr) => arr.every((u) => pathFromUrl(u) !== null), "One of the images is not from the merch bucket."),
});

export async function saveMerchProduct(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success || (id !== null && !isUuid(id))) {
    return { ok: false, error: parsed.error?.issues[0]?.message ?? "Invalid request." };
  }
  const d = parsed.data;
  const row = {
    name: d.name,
    description: d.description || null,
    price: Math.round(d.price * 100) / 100,
    stock: d.stock,
    is_available: d.isAvailable,
    images: d.images,
  };
  try {
    const supabase = await createServerClient();
    let productId = id;
    let removedImages: string[] = [];
    if (id) {
      const { data: before } = await supabase.from("merch_products").select("images").eq("id", id).maybeSingle();
      if (!before) return { ok: false, error: "Product not found." };
      removedImages = ((before.images as string[]) ?? []).filter((u) => !d.images.includes(u));
      const { error } = await supabase.from("merch_products").update(row).eq("id", id);
      if (error) {
        console.error("[merch] update failed", error);
        return { ok: false, error: GENERIC_ERROR };
      }
    } else {
      const { data, error } = await supabase.from("merch_products").insert(row).select("id").single();
      if (error || !data) {
        console.error("[merch] insert failed", error);
        return { ok: false, error: GENERIC_ERROR };
      }
      productId = data.id as string;
    }
    const paths = removedImages.map(pathFromUrl).filter((p): p is string => !!p);
    if (paths.length) {
      const { error } = await createAdminClient().storage.from(BUCKET).remove(paths);
      if (error) console.error("[merch] image cleanup failed", error);
    }
    await logAudit({
      adminId: admin.id,
      action: id ? "merch.update" : "merch.create",
      targetType: "merch_product",
      targetId: productId,
      metadata: { name: d.name, price: row.price, stock: d.stock, is_available: d.isAvailable },
    });
    revalidatePath("/merch");
    revalidatePath("/admin/merchandise");
    return { ok: true, id: productId as string };
  } catch (err) {
    console.error("[merch] save failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function setMerchAvailability(id: string, isAvailable: boolean): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id) || typeof isAvailable !== "boolean") return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("merch_products").update({ is_available: isAvailable }).eq("id", id);
    if (error) {
      console.error("[merch] availability failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({
      adminId: admin.id,
      action: "merch.availability",
      targetType: "merch_product",
      targetId: id,
      metadata: { is_available: isAvailable },
    });
    revalidatePath("/merch");
    revalidatePath("/admin/merchandise");
    return { ok: true };
  } catch (err) {
    console.error("[merch] availability failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteMerchProduct(id: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { data: row } = await supabase.from("merch_products").select("name, images").eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "Product not found." };
    const { error } = await supabase.from("merch_products").delete().eq("id", id);
    if (error) {
      console.error("[merch] delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    const paths = ((row.images as string[]) ?? []).map(pathFromUrl).filter((p): p is string => !!p);
    if (paths.length) await createAdminClient().storage.from(BUCKET).remove(paths);
    await logAudit({
      adminId: admin.id,
      action: "merch.delete",
      targetType: "merch_product",
      targetId: id,
      metadata: { name: row.name as string },
    });
    revalidatePath("/merch");
    revalidatePath("/admin/merchandise");
    return { ok: true };
  } catch (err) {
    console.error("[merch] delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
