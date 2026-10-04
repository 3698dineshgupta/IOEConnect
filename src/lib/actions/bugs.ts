"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { BUG_STATUSES } from "@/lib/types";
import type { ActionResult } from "@/components/community/common";
import { GENERIC_ERROR, NOT_ALLOWED, clientIp, getAdminProfile, isUuid, rateLimit } from "@/components/community/guards";

const BUCKET = "bug-screenshots";

const bugSchema = z.object({
  title: z.string().trim().min(4, "Please give the bug a short title (at least 4 characters).").max(300, "Title is too long."),
  description: z
    .string()
    .trim()
    .min(10, "Please describe what happened (at least 10 characters).")
    .max(10000, "Description is too long."),
  screenshotPath: z.string().max(300).optional().nullable(),
  pageUrl: z.string().trim().max(500).optional().default(""),
  device: z.string().trim().max(200).optional().default(""),
  browser: z.string().trim().max(200).optional().default(""),
  website: z.string().optional().default(""), // honeypot
});

export async function submitBugReport(input: unknown): Promise<ActionResult> {
  const parsed = bugSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;
  if (d.website.trim() !== "") return { ok: true };

  const user = await getSessionUser();
  const ip = await clientIp();
  const key = user ? `bug:user:${user.id}` : `bug:ip:${ip}`;
  if (!rateLimit(key, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "You have sent several reports recently. Please try again later." };
  }

  let screenshotPath: string | null = null;
  if (d.screenshotPath) {
    const ok = !!user && new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(png|jpe?g|webp)$`, "i").test(d.screenshotPath);
    if (!ok) return { ok: false, error: "The screenshot could not be verified. Please try attaching it again." };
    screenshotPath = d.screenshotPath;
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user?.id ?? null,
      title: d.title,
      description: d.description,
      screenshot_path: screenshotPath,
      page_url: d.pageUrl || null,
      device: d.device || null,
      browser: d.browser || null,
    });
    if (error) {
      console.error("[bugs] insert failed", error);
      if (screenshotPath) await createAdminClient().storage.from(BUCKET).remove([screenshotPath]);
      return { ok: false, error: GENERIC_ERROR };
    }
    return { ok: true };
  } catch (err) {
    console.error("[bugs] submit failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function setBugStatus(id: string, status: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = z.enum(BUG_STATUSES).safeParse(status);
  if (!parsed.success || !isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("bug_reports").update({ status: parsed.data }).eq("id", id);
    if (error) {
      console.error("[bugs] status failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({
      adminId: admin.id,
      action: "bug.status",
      targetType: "bug_report",
      targetId: id,
      metadata: { status: parsed.data },
    });
    revalidatePath("/admin/bugs");
    return { ok: true };
  } catch (err) {
    console.error("[bugs] status failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteBugReport(id: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { data: row } = await supabase.from("bug_reports").select("screenshot_path, title").eq("id", id).maybeSingle();
    if (!row) return { ok: false, error: "Report not found." };
    const { error } = await supabase.from("bug_reports").delete().eq("id", id);
    if (error) {
      console.error("[bugs] delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    if (row.screenshot_path) {
      const { error: rmErr } = await createAdminClient().storage.from(BUCKET).remove([row.screenshot_path as string]);
      if (rmErr) console.error("[bugs] screenshot remove failed", rmErr);
    }
    await logAudit({
      adminId: admin.id,
      action: "bug.delete",
      targetType: "bug_report",
      targetId: id,
      metadata: { title: row.title as string },
    });
    revalidatePath("/admin/bugs");
    return { ok: true };
  } catch (err) {
    console.error("[bugs] delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
