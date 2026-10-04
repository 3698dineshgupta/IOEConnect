import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import { getProfile, isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { ACCESS_TYPES, SETTING_KEYS, type SettingKey, type SettingsMap } from "@/lib/types";
import { DEFAULT_GRADE_BANDS } from "@/lib/scgpa";

export const SETTINGS_CACHE_TAG = "settings";

// ---------------------------------------------------------------------------
// Defaults (mirror supabase/migrations/*_default_settings.sql)
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS: SettingsMap = {
  site: {
    name: "IOE Connect",
    tagline: "Notes, past questions and resources for IOE students",
    description:
      "IOE Connect organises notes, past year questions, syllabus and reference material for Institute of Engineering students, semester by semester.",
    contact_email: "",
    social: { facebook: "", instagram: "", telegram: "", discord: "", youtube: "" },
    announcement: { enabled: false, message: "", href: "" },
    maintenance_mode: false,
    allow_registrations: true,
  },
  premium: {
    enabled: true,
    currency: "NPR",
    free_preview_pages: 3,
    benefits: [
      "Access to all premium notes and PYQs",
      "Download and print any PDF (stamped with your email)",
      "Year-wise past question filtering",
      "Early access to newly uploaded resources",
    ],
  },
  referral: {
    enabled: true,
    reward_days: 7,
    reward_amount: 0,
    description:
      "Invite friends with your referral code. When they purchase premium, you earn bonus premium days.",
  },
  resources: {
    max_upload_mb: 50,
    compress_pdfs: true,
    default_access_type: "FREE",
    view_dedupe_minutes: 30,
    pdf_token_ttl_seconds: 300,
    require_login_for_free: false,
    allow_student_uploads: true,
    allow_requests: true,
  },
  payment: {
    currency: "NPR",
    instructions:
      "Pay the plan amount using one of the methods below, then submit the transaction reference and a screenshot. Payments are verified manually, usually within 24 hours.",
    methods: [
      { id: "esewa", label: "eSewa", enabled: true, account_name: "", account_id: "", qr_path: null },
      { id: "khalti", label: "Khalti", enabled: true, account_name: "", account_id: "", qr_path: null },
      { id: "bank", label: "Bank transfer", enabled: false, account_name: "", account_id: "", bank_name: "", qr_path: null },
    ],
  },
  scgpa: {
    scale: 4,
    decimals: 2,
    min_pass_points: 2,
    // UNVERIFIED default bands — confirm against the official TU/IOE rules in Admin → Settings → SCGPA.
    grades: DEFAULT_GRADE_BANDS.map((b) => ({ ...b })),
  },
};

// ---------------------------------------------------------------------------
// Validation schemas (used by setSetting; exported for admin forms)
// ---------------------------------------------------------------------------
const str = (max = 2000) => z.string().trim().max(max);
const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(500)]);

export const SETTINGS_SCHEMAS = {
  site: z.object({
    name: str(100).min(1),
    tagline: str(200),
    description: str(1000),
    contact_email: z.union([z.literal(""), z.string().trim().email().max(320)]),
    social: z.object({
      facebook: optionalUrl.optional(),
      instagram: optionalUrl.optional(),
      telegram: optionalUrl.optional(),
      discord: optionalUrl.optional(),
      youtube: optionalUrl.optional(),
    }),
    announcement: z.object({ enabled: z.boolean(), message: str(300), href: str(500) }),
    maintenance_mode: z.boolean(),
    allow_registrations: z.boolean(),
  }),
  premium: z.object({
    enabled: z.boolean(),
    currency: str(10).min(1),
    free_preview_pages: z.number().int().min(0).max(50),
    benefits: z.array(str(200)).max(20),
  }),
  referral: z.object({
    enabled: z.boolean(),
    reward_days: z.number().int().min(0).max(365),
    reward_amount: z.number().min(0).max(100000),
    description: str(500),
  }),
  resources: z.object({
    max_upload_mb: z.number().int().min(1).max(200),
    compress_pdfs: z.boolean(),
    default_access_type: z.enum(ACCESS_TYPES),
    view_dedupe_minutes: z.number().int().min(1).max(1440),
    pdf_token_ttl_seconds: z.number().int().min(30).max(3600),
    require_login_for_free: z.boolean(),
    allow_student_uploads: z.boolean(),
    allow_requests: z.boolean(),
  }),
  payment: z.object({
    currency: str(10).min(1),
    instructions: str(2000),
    methods: z
      .array(
        z.object({
          id: z.string().trim().regex(/^[a-z0-9_-]{1,32}$/),
          label: str(60).min(1),
          enabled: z.boolean(),
          account_name: str(120),
          account_id: str(120),
          bank_name: str(120).optional(),
          qr_path: z.string().trim().max(500).nullable(),
        }),
      )
      .max(10),
  }),
  scgpa: z.object({
    scale: z.number().positive().max(10),
    decimals: z.number().int().min(0).max(4),
    min_pass_points: z.number().min(0).max(10),
    grades: z
      .array(
        z.preprocess(
          // Back-compat: old rows are {grade, points}; fill min_percent from the default band of that grade.
          (row) => {
            if (!isPlainObject(row) || typeof row.min_percent === "number") return row;
            const g = typeof row.grade === "string" ? row.grade.trim().toUpperCase() : "";
            const d = DEFAULT_GRADE_BANDS.find((b) => b.grade.toUpperCase() === g);
            return d ? { ...row, min_percent: d.min_percent } : row;
          },
          z.object({
            grade: z.string().trim().min(1).max(4),
            points: z.number().min(0).max(4), // scgpa_grades.points check is 0..4
            min_percent: z.number().min(0).max(100),
          }),
        ),
      )
      .min(1)
      .max(20)
      .superRefine((rows, ctx) => {
        const mins = rows.map((r) => r.min_percent);
        if (new Set(mins).size !== mins.length) ctx.addIssue({ code: "custom", message: "Each grade needs a different minimum %." });
        const grades = rows.map((r) => r.grade.toUpperCase());
        if (new Set(grades).size !== grades.length) ctx.addIssue({ code: "custom", message: "Grade names must be unique." });
      })
      // Always stored high → low.
      .transform((rows) => [...rows].sort((a, b) => b.min_percent - a.min_percent)),
  }),
} satisfies { [K in SettingKey]: z.ZodType<SettingsMap[K]> };

function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(key);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Merge stored value over defaults (one level deep for nested objects). */
function mergeWithDefaults<K extends SettingKey>(key: K, stored: unknown): SettingsMap[K] {
  const defaults = DEFAULT_SETTINGS[key];
  if (!isPlainObject(stored)) return defaults;
  const merged: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(stored)) {
    const d = (defaults as unknown as Record<string, unknown>)[k];
    merged[k] = isPlainObject(d) && isPlainObject(v) ? { ...d, ...v } : v;
  }
  const parsed = SETTINGS_SCHEMAS[key].safeParse(merged);
  if (!parsed.success) {
    console.error(`[settings] stored value for "${key}" is invalid; using defaults`, parsed.error.issues);
    return defaults;
  }
  return parsed.data as SettingsMap[K];
}

const readAllSettings = unstable_cache(
  async (): Promise<Partial<Record<SettingKey, unknown>>> => {
    const { data, error } = await createAdminClient().from("site_settings").select("key, value");
    if (error) throw error;
    const out: Partial<Record<SettingKey, unknown>> = {};
    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      if (isSettingKey(row.key)) out[row.key] = row.value;
    }
    return out;
  },
  ["site-settings-all"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 300 },
);

const readAllSettingsDeduped = cache(async () => {
  try {
    return await readAllSettings();
  } catch (err) {
    console.error("[settings] failed to load site_settings; using defaults", err);
    return {} as Partial<Record<SettingKey, unknown>>;
  }
});

/** Read a setting (cached, merged over defaults, never throws). Server-only. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const all = await readAllSettingsDeduped();
  return mergeWithDefaults(key, all[key]);
}

/** Read every setting at once. */
export async function getAllSettings(): Promise<SettingsMap> {
  const all = await readAllSettingsDeduped();
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, mergeWithDefaults(k, all[k])])) as unknown as SettingsMap;
}

/** Keep the scgpa_grades mirror table in sync with site_settings.scgpa. */
async function syncScgpaGrades(grades: SettingsMap["scgpa"]["grades"]): Promise<void> {
  try {
    const admin = createAdminClient();
    const rows = grades.map((g, i) => ({ grade: g.grade, points: g.points, min_percent: g.min_percent, sort_order: i + 1 }));
    const { error: upErr } = await admin.from("scgpa_grades").upsert(rows, { onConflict: "grade" });
    if (upErr) throw upErr;
    const keep = rows.map((r) => r.grade);
    const { data: existing, error: selErr } = await admin.from("scgpa_grades").select("grade");
    if (selErr) throw selErr;
    const stale = ((existing ?? []) as { grade: string }[]).map((r) => r.grade).filter((g) => !keep.includes(g));
    if (stale.length) {
      const { error: delErr } = await admin.from("scgpa_grades").delete().in("grade", stale);
      if (delErr) throw delErr;
    }
  } catch (err) {
    console.error("[settings] scgpa_grades sync failed", err);
  }
}

export type SetSettingResult = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Validate and save a setting. Admin-only (checked here AND enforced by RLS).
 * Writes an audit log and invalidates the settings cache.
 */
export async function setSetting<K extends SettingKey>(key: K, value: SettingsMap[K]): Promise<SetSettingResult> {
  if (!isSettingKey(key)) return { ok: false, error: "Unknown setting." };

  const profile = await getProfile();
  if (!profile || !isAdmin(profile)) return { ok: false, error: "You are not allowed to change settings." };

  const parsed = SETTINGS_SCHEMAS[key].safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".") || key}: ${first.message}` : "Invalid settings." };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value: parsed.data, updated_by: profile.id }, { onConflict: "key" });
    if (error) {
      console.error("[settings] upsert failed", { key, error });
      return { ok: false, error: "Could not save settings. Please try again." };
    }
  } catch (err) {
    console.error("[settings] upsert failed", { key, err });
    return { ok: false, error: "Could not save settings. Please try again." };
  }

  if (key === "scgpa") await syncScgpaGrades((parsed.data as SettingsMap["scgpa"]).grades);

  await logAudit({ adminId: profile.id, action: "settings.update", targetType: "site_settings", targetId: key });
  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
  return { ok: true, value: parsed.data };
}
