import "server-only";

// Server-only helpers shared by the premium, payment-history and referral pages.
// (Not a "use server" module: nothing here is callable from the browser.)

import type { User } from "@supabase/supabase-js";
import type { ShellUser } from "@/components/layout/nav-config";
import type { PaymentMethodView } from "@/components/premium/constants";
import { createAdminClient } from "@/lib/supabase/server";
import type { PaymentMethodSetting, PremiumPlan, Profile } from "@/lib/types";

export function toShellUser(profile: Profile | null, user?: User | null): ShellUser | null {
  if (!profile && !user) return null;
  return {
    name: profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? null,
    email: profile?.email ?? user?.email ?? null,
    avatar: profile?.avatar ?? null,
    role: profile?.role ?? "USER",
  };
}

/** "john.doe@gmail.com" -> "jo•••e@gmail.com" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "Hidden";
  const at = email.indexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visibleStart = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  const visibleEnd = local.length > 3 ? local.slice(-1) : "";
  return `${visibleStart}•••${visibleEnd}@${domain}`;
}

/** Normalise a premium_plans row coming from PostgREST (numeric -> number, benefits jsonb -> string[]). */
export function normalizePlan(row: Record<string, unknown>): PremiumPlan {
  const benefits = Array.isArray(row.benefits)
    ? (row.benefits as unknown[]).filter((b): b is string => typeof b === "string" && b.trim() !== "")
    : [];
  return {
    ...(row as unknown as PremiumPlan),
    price: Number(row.price),
    duration_days: Number(row.duration_days),
    benefits,
  };
}

/**
 * Enabled payment methods with a displayable QR URL. QR images live in the
 * private `site-assets` bucket, so a short-lived signed URL is minted here.
 * Absolute http(s) URLs stored by admins are passed through unchanged.
 */
export async function resolvePaymentMethods(methods: PaymentMethodSetting[]): Promise<PaymentMethodView[]> {
  const enabled = methods.filter((m) => m.enabled);
  return Promise.all(
    enabled.map(async (m) => {
      let qrUrl: string | null = null;
      const path = m.qr_path?.trim();
      if (path) {
        if (/^https?:\/\//i.test(path)) {
          qrUrl = path;
        } else {
          try {
            const { data, error } = await createAdminClient()
              .storage.from("site-assets")
              .createSignedUrl(path.replace(/^\/+/, ""), 60 * 60);
            if (error) console.error("[premium] QR signed URL failed", { method: m.id, error });
            qrUrl = data?.signedUrl ?? null;
          } catch (err) {
            console.error("[premium] QR signed URL failed", { method: m.id, err });
          }
        }
      }
      return {
        id: m.id,
        label: m.label,
        account_name: m.account_name,
        account_id: m.account_id,
        bank_name: m.bank_name,
        qrUrl,
      };
    }),
  );
}

export function methodLabel(methods: PaymentMethodSetting[], id: string): string {
  return methods.find((m) => m.id === id)?.label ?? id;
}
