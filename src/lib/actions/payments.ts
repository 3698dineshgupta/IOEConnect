"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PAYMENT_SCREENSHOT_BUCKET,
  SCREENSHOT_PATH_RE,
  type ActionResult,
} from "@/components/premium/constants";
import { getProfile, getSessionUser, isAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { isTelegramConfigured, sendAdminPhoto } from "@/lib/telegram";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import type { ApprovePaymentResult } from "@/lib/types";

const PAYMENT_PATHS = ["/premium", "/payment-history", "/admin/payments", "/referrals", "/admin/referrals", "/dashboard"];

function revalidatePaymentPaths() {
  for (const p of PAYMENT_PATHS) revalidatePath(p);
}

async function requireAdminForAction(): Promise<{ ok: true; adminId: string } | { ok: false; error: string }> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return { ok: false, error: "You are not allowed to review payments." };
  return { ok: true, adminId: profile.id };
}

/** Turn Postgres/PostgREST errors from the review RPCs into friendly text. */
function friendlyRpcError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (/already approved/i.test(msg)) return "This payment has already been approved.";
  if (/already rejected/i.test(msg)) return "This payment has already been rejected.";
  if (/not found/i.test(msg)) return "Payment not found. It may have been removed.";
  if (/future/i.test(msg)) return "The expiry override must be a date in the future.";
  if (/reason is required/i.test(msg)) return "Please give a reason for rejecting this payment.";
  if (error?.code === "42501" || /forbidden/i.test(msg)) return "You are not allowed to review payments.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// User: submit a manual payment
// ---------------------------------------------------------------------------
const submitPaymentSchema = z.object({
  programId: z.uuid({ message: "Please choose the program you want premium for." }),
  planId: z.uuid({ message: "Please choose a plan." }),
  paymentMethod: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,32}$/, "Please choose a payment method."),
  transactionReference: z
    .string()
    .trim()
    .min(4, "Enter the transaction ID / reference shown in your payment app.")
    .max(100, "The transaction reference is too long.")
    .regex(/^[\w\-./#: ]+$/, "The transaction reference contains invalid characters."),
  screenshotPath: z.string().trim().regex(SCREENSHOT_PATH_RE, "Please upload a payment screenshot."),
});

export type SubmitPaymentInput = z.input<typeof submitPaymentSchema>;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Forward a new premium request (details + screenshot) to the admins' Telegram chat. Best effort: never throws. */
async function notifyAdminsOfPayment(p: {
  paymentId: string;
  amount: number;
  userId: string;
  planId: string;
  programName: string;
  methodLabel: string;
  transactionReference: string;
  screenshotPath: string;
}): Promise<void> {
  try {
    if (!isTelegramConfigured()) return;
    const admin = createAdminClient();
    const [profileRes, planRes, fileRes] = await Promise.all([
      admin.from("profiles").select("full_name, email, college, year, semester").eq("id", p.userId).maybeSingle(),
      admin.from("premium_plans").select("name, duration_days").eq("id", p.planId).maybeSingle(),
      admin.storage.from(PAYMENT_SCREENSHOT_BUCKET).download(p.screenshotPath),
    ]);
    if (!fileRes.data) return;
    const profile = profileRes.data as { full_name: string | null; email: string | null; college: string | null; year: number | null; semester: number | null } | null;
    const plan = planRes.data as { name: string; duration_days: number } | null;
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

    const lines = [
      "<b>New premium request</b>",
      `Name: ${escapeHtml(profile?.full_name ?? "-")}`,
      `Email: ${escapeHtml(profile?.email ?? "-")}`,
      profile?.college ? `College: ${escapeHtml(profile.college)}` : null,
      profile?.year ? `Year ${profile.year}${profile.semester ? `, semester ${profile.semester}` : ""}` : null,
      `Program: <b>${escapeHtml(p.programName)}</b>`,
      `Plan: ${escapeHtml(plan?.name ?? "-")}${plan ? ` (${plan.duration_days} days)` : ""}`,
      `Amount: ${p.amount}`,
      `Method: ${escapeHtml(p.methodLabel)}`,
      `Transaction ref: <code>${escapeHtml(p.transactionReference)}</code>`,
      `Payment ID: <code>${p.paymentId}</code>`,
      base ? `Review: ${base}/admin/payments` : null,
    ].filter(Boolean) as string[];

    const image = new Uint8Array(await fileRes.data.arrayBuffer());
    await sendAdminPhoto(image, fileRes.data.type || "image/jpeg", lines.join("\n"));
  } catch (err) {
    console.warn("[payments] admin Telegram notification failed", err instanceof Error ? err.message : "unknown");
  }
}

export async function submitPayment(input: SubmitPaymentInput): Promise<ActionResult<{ paymentId: string }>> {
  const parsed = submitPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const { planId, programId, paymentMethod, transactionReference, screenshotPath } = parsed.data;

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please log in to submit a payment." };

  // The uploaded file must live in the caller's own folder.
  const match = SCREENSHOT_PATH_RE.exec(screenshotPath);
  if (!match || match[1].toLowerCase() !== user.id.toLowerCase()) {
    return { ok: false, error: "The uploaded screenshot is invalid. Please upload it again." };
  }

  const [premiumSettings, paymentSettings] = await Promise.all([getSetting("premium"), getSetting("payment")]);
  if (!premiumSettings.enabled) {
    return { ok: false, error: "Premium purchases are paused right now. Please check back later." };
  }
  const method = paymentSettings.methods.find((m) => m.id === paymentMethod && m.enabled);
  if (!method) return { ok: false, error: "That payment method is not available. Please choose another." };

  try {
    const supabase = await createServerClient();

    // Plan must exist and be active (the insert trigger re-checks and forces the amount).
    const { data: plan, error: planError } = await supabase
      .from("premium_plans")
      .select("id")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) return { ok: false, error: "That plan is no longer available. Please choose another." };

    // Premium is per program: it must be an active program.
    const { data: program, error: programError } = await supabase
      .from("programs")
      .select("id, name, short_name")
      .eq("id", programId)
      .eq("is_active", true)
      .maybeSingle();
    if (programError) throw programError;
    if (!program) return { ok: false, error: "That program is not available. Please choose another." };

    // One pending payment at a time.
    const { count: pendingCount, error: pendingError } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "PENDING");
    if (pendingError) throw pendingError;
    if ((pendingCount ?? 0) > 0) {
      return {
        ok: false,
        error: "You already have a payment waiting for review. We'll verify it soon, usually within 24 hours.",
      };
    }

    // The screenshot must actually have been uploaded.
    const fileName = screenshotPath.slice(screenshotPath.indexOf("/") + 1);
    const { data: objects, error: listError } = await supabase.storage
      .from(PAYMENT_SCREENSHOT_BUCKET)
      .list(user.id, { search: fileName, limit: 5 });
    if (listError) throw listError;
    if (!objects?.some((o) => o.name === fileName)) {
      return { ok: false, error: "We couldn't find your uploaded screenshot. Please upload it again." };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        plan_id: planId,
        program_id: programId,
        amount: 0, // overwritten by the payments_before_insert trigger with the plan price
        payment_method: method.id,
        transaction_reference: transactionReference,
        screenshot_path: screenshotPath,
        status: "PENDING",
      })
      .select("id, amount")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return { ok: false, error: "This transaction reference has already been submitted." };
      }
      if (/plan is not available/i.test(insertError.message)) {
        return { ok: false, error: "That plan is no longer available. Please choose another." };
      }
      throw insertError;
    }

    await notifyAdminsOfPayment({
      paymentId: inserted.id as string,
      amount: Number(inserted.amount),
      userId: user.id,
      planId,
      programName: (program.short_name as string | null) ? `${program.short_name} (${program.name})` : (program.name as string),
      methodLabel: method.label ?? method.id,
      transactionReference,
      screenshotPath,
    });

    revalidatePaymentPaths();
    return { ok: true, data: { paymentId: inserted.id as string }, message: "Payment submitted for review." };
  } catch (err) {
    console.error("[payments] submitPayment failed", err);
    return { ok: false, error: "We couldn't submit your payment. Please try again in a moment." };
  }
}

// ---------------------------------------------------------------------------
// Admin: approve / reject (audit logs are written inside the SQL functions)
// ---------------------------------------------------------------------------
const approveSchema = z.object({
  paymentId: z.uuid(),
  /** ISO datetime; optional explicit premium expiry. */
  expiryOverride: z.iso.datetime({ offset: true }).nullish(),
});

export async function approvePayment(
  input: z.input<typeof approveSchema>,
): Promise<ActionResult<{ premiumExpiresAt: string; referral: ApprovePaymentResult["referral"] }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;

  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid approval request." };
  const { paymentId, expiryOverride } = parsed.data;

  if (expiryOverride && new Date(expiryOverride).getTime() <= Date.now()) {
    return { ok: false, error: "The expiry override must be a date in the future." };
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc("approve_payment", {
      p_payment_id: paymentId,
      p_expiry_override: expiryOverride ?? null,
    });
    if (error) {
      console.error("[payments] approve_payment failed", { paymentId, error });
      return { ok: false, error: friendlyRpcError(error) };
    }
    const result = data as ApprovePaymentResult;
    revalidatePaymentPaths();
    return {
      ok: true,
      data: { premiumExpiresAt: result.premium_expires_at, referral: result.referral },
      message: "Payment approved and premium activated.",
    };
  } catch (err) {
    console.error("[payments] approvePayment failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const rejectSchema = z.object({
  paymentId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Please give a reason (at least 3 characters).")
    .max(1000, "Keep the reason under 1000 characters."),
});

export async function rejectPayment(input: z.input<typeof rejectSchema>): Promise<ActionResult> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.rpc("reject_payment", {
      p_payment_id: parsed.data.paymentId,
      p_reason: parsed.data.reason,
    });
    if (error) {
      console.error("[payments] reject_payment failed", { paymentId: parsed.data.paymentId, error });
      return { ok: false, error: friendlyRpcError(error) };
    }
    revalidatePaymentPaths();
    return { ok: true, data: null, message: "Payment rejected." };
  } catch (err) {
    console.error("[payments] rejectPayment failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Admin: 60-second signed URL for a payment screenshot (generated server-side). */
export async function getPaymentScreenshotUrl(paymentId: string): Promise<ActionResult<{ url: string }>> {
  const auth = await requireAdminForAction();
  if (!auth.ok) return auth;
  if (!z.uuid().safeParse(paymentId).success) return { ok: false, error: "Invalid payment." };

  try {
    const admin = createAdminClient();
    const { data: payment, error } = await admin
      .from("payments")
      .select("screenshot_path")
      .eq("id", paymentId)
      .maybeSingle();
    if (error) throw error;
    const path = payment?.screenshot_path as string | null | undefined;
    if (!path) return { ok: false, error: "No screenshot was attached to this payment." };

    const { data: signed, error: signError } = await admin.storage
      .from(PAYMENT_SCREENSHOT_BUCKET)
      .createSignedUrl(path, 60);
    if (signError || !signed?.signedUrl) {
      console.error("[payments] screenshot signed URL failed", { paymentId, signError });
      return { ok: false, error: "The screenshot could not be loaded. It may have been deleted." };
    }
    return { ok: true, data: { url: signed.signedUrl } };
  } catch (err) {
    console.error("[payments] getPaymentScreenshotUrl failed", err);
    return { ok: false, error: "The screenshot could not be loaded. Please try again." };
  }
}
