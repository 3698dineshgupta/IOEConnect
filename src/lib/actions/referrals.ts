"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/premium/constants";
import { logAudit } from "@/lib/audit";
import { getProfile, isAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";

const referralSettingsSchema = z.object({
  enabled: z.boolean(),
  reward_days: z.coerce
    .number({ message: "Reward days must be a number." })
    .int("Reward days must be a whole number.")
    .min(0, "Reward days cannot be negative.")
    .max(365, "Reward days can be at most 365."),
  reward_amount: z.coerce
    .number({ message: "Reward amount must be a number." })
    .min(0, "Reward amount cannot be negative.")
    .max(100000, "Reward amount is too large."),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
});

export type ReferralSettingsInput = z.input<typeof referralSettingsSchema>;

/** Admin: save site_settings.referral (setSetting re-checks admin and writes the audit log). */
export async function updateReferralSettings(input: ReferralSettingsInput): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return { ok: false, error: "You are not allowed to change referral settings." };

  const parsed = referralSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const result = await setSetting("referral", parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/referrals");
  revalidatePath("/referrals");
  return { ok: true, data: null, message: "Referral settings saved." };
}

/** Admin: mark a QUALIFIED referral as REWARDED (manual payout done). */
export async function markReferralRewarded(referralId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return { ok: false, error: "You are not allowed to update referrals." };
  if (!z.uuid().safeParse(referralId).success) return { ok: false, error: "Invalid referral." };

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("referrals")
      .update({ status: "REWARDED" })
      .eq("id", referralId)
      .eq("status", "QUALIFIED")
      .select("id, referrer_id, referred_id, reward_amount, payment_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "This referral is no longer awaiting a reward. Refresh and try again." };

    await logAudit({
      adminId: profile.id,
      action: "referral.mark_rewarded",
      targetType: "referral",
      targetId: referralId,
      metadata: {
        referrer_id: data.referrer_id as string,
        referred_id: data.referred_id as string,
        reward_amount: Number(data.reward_amount),
        payment_id: (data.payment_id as string | null) ?? null,
      },
    });

    revalidatePath("/admin/referrals");
    revalidatePath("/referrals");
    return { ok: true, data: null, message: "Referral marked as rewarded." };
  } catch (err) {
    console.error("[referrals] markReferralRewarded failed", err);
    return { ok: false, error: "Could not update the referral. Please try again." };
  }
}
