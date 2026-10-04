"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createServerClient } from "@/lib/supabase/server";
import { CONTACT_STATUSES } from "@/lib/types";
import type { ActionResult } from "@/components/community/common";
import { GENERIC_ERROR, NOT_ALLOWED, clientIp, getAdminProfile, isUuid, rateLimit } from "@/components/community/guards";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(200, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(320),
  subject: z.string().trim().max(300, "Subject is too long.").optional().default(""),
  message: z
    .string()
    .trim()
    .min(10, "Please write a few more words (at least 10 characters).")
    .max(5000, "Message is too long (max 5000 characters)."),
  website: z.string().optional().default(""), // honeypot
});

export async function submitContactMessage(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  // Honeypot: pretend success so bots learn nothing.
  if (d.website.trim() !== "") return { ok: true };

  const ip = await clientIp();
  if (
    !rateLimit(`contact:ip:${ip}`, 5, 60 * 60 * 1000) ||
    !rateLimit(`contact:email:${d.email.toLowerCase()}`, 3, 60 * 60 * 1000)
  ) {
    return { ok: false, error: "You have sent several messages recently. Please try again later." };
  }

  try {
    const user = await getSessionUser();
    const supabase = await createServerClient();
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      name: d.name,
      email: d.email,
      subject: d.subject || null,
      message: d.message,
    });
    if (error) {
      console.error("[contact] insert failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    return { ok: true };
  } catch (err) {
    console.error("[contact] submit failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const statusSchema = z.object({ status: z.enum(CONTACT_STATUSES) });

export async function setContactStatus(id: string, status: string, opts: { silent?: boolean } = {}): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success || !isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("contact_messages").update({ status: parsed.data.status }).eq("id", id);
    if (error) {
      console.error("[contact] status failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    // Auto "mark read on open" is not an admin decision worth an audit entry.
    if (!opts.silent) {
      await logAudit({
        adminId: admin.id,
        action: "contact.status",
        targetType: "contact_message",
        targetId: id,
        metadata: { status: parsed.data.status },
      });
    }
    return { ok: true };
  } catch (err) {
    console.error("[contact] status failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteContactMessage(id: string): Promise<ActionResult> {
  const admin = await getAdminProfile();
  if (!admin) return { ok: false, error: NOT_ALLOWED };
  if (!isUuid(id)) return { ok: false, error: "Invalid request." };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      console.error("[contact] delete failed", error);
      return { ok: false, error: GENERIC_ERROR };
    }
    await logAudit({ adminId: admin.id, action: "contact.delete", targetType: "contact_message", targetId: id });
    return { ok: true };
  } catch (err) {
    console.error("[contact] delete failed", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
