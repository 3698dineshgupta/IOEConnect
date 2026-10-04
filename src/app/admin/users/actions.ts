"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { USER_ROLES } from "@/lib/types";
import { assertAdmin, zodMessage, type ActionResult } from "@/components/admin/guard";

const uuid = z.string().uuid();

type PremiumFields = {
  is_premium: boolean;
  premium_started_at: string | null;
  premium_expires_at: string | null;
};

// Premium fields and roles are written with the admin's own session so database guard triggers and RLS see a real admin.
async function patchProfile(id: string, patch: Record<string, unknown>) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) console.error("[admin/users] profile update failed", error);
  return !error && !!data;
}

/** The account summary on profiles = any active program; latest expiry across programs. */
async function syncPremiumSummary(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("premium_access")
    .select("started_at, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString());
  if (error) return false;
  const rows = data ?? [];
  if (!rows.length) {
    // Keep the last expiry visible (shows "Expired" in the admin list).
    return patchProfile(userId, { is_premium: false });
  }
  const latest = rows.map((r) => r.expires_at as string).sort().at(-1)!;
  const earliest = rows.map((r) => r.started_at as string).sort()[0];
  const patch: PremiumFields = { is_premium: true, premium_started_at: earliest, premium_expires_at: latest };
  return patchProfile(userId, patch);
}

const programId = z.string().uuid("Choose a program.");

export async function grantPremiumAction(userId: string, days: number, program: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, days: z.number().int().min(1).max(3650), program: programId }).safeParse({ id: userId, days, program });
  if (!p.success) return { ok: false, error: zodMessage(p.error) };
  const db = createAdminClient();
  const { data: cur, error: curErr } = await db.from("premium_access").select("started_at, expires_at").eq("user_id", p.data.id).eq("program_id", p.data.program).maybeSingle();
  if (curErr) return { ok: false, error: "Could not read premium. Is the program-premium migration applied?" };
  const now = Date.now();
  const existing = cur?.expires_at ? new Date(cur.expires_at as string).getTime() : 0;
  const expires = new Date(Math.max(now, existing) + p.data.days * 86_400_000).toISOString();
  const started = existing > now && cur?.started_at ? (cur.started_at as string) : new Date(now).toISOString();
  const { error } = await db
    .from("premium_access")
    .upsert({ user_id: p.data.id, program_id: p.data.program, started_at: started, expires_at: expires, updated_at: new Date().toISOString() }, { onConflict: "user_id,program_id" });
  if (error || !(await syncPremiumSummary(p.data.id))) return { ok: false, error: "Could not update premium. Please try again." };
  await logAudit({ adminId: auth.profile.id, action: "user.premium_grant", targetType: "profile", targetId: p.data.id, metadata: { days: p.data.days, program_id: p.data.program, expires_at: expires } });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** `program` = a program id, or "all" to remove every program. */
export async function revokePremiumAction(userId: string, program: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, program: z.union([z.literal("all"), programId]) }).safeParse({ id: userId, program });
  if (!p.success) return { ok: false, error: "Invalid request." };
  const db = createAdminClient();
  let q = db.from("premium_access").delete().eq("user_id", p.data.id);
  if (p.data.program !== "all") q = q.eq("program_id", p.data.program);
  const { error } = await q;
  if (error) return { ok: false, error: "Could not revoke premium. Please try again." };
  if (p.data.program === "all") {
    // Also clear the account summary so nothing keeps showing as active.
    const patch: PremiumFields = { is_premium: false, premium_started_at: null, premium_expires_at: new Date().toISOString() };
    if (!(await patchProfile(p.data.id, patch))) return { ok: false, error: "Could not revoke premium. Please try again." };
  } else if (!(await syncPremiumSummary(p.data.id))) {
    return { ok: false, error: "Could not revoke premium. Please try again." };
  }
  await logAudit({ adminId: auth.profile.id, action: "user.premium_revoke", targetType: "profile", targetId: p.data.id, metadata: { program_id: p.data.program } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setPremiumExpiryAction(userId: string, expiresOn: string, program: string): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"), program: programId }).safeParse({ id: userId, date: expiresOn, program });
  if (!p.success) return { ok: false, error: zodMessage(p.error) };
  // End of the chosen day, Nepal time.
  const expires = new Date(`${p.data.date}T23:59:59+05:45`);
  if (Number.isNaN(expires.getTime())) return { ok: false, error: "Choose a valid date." };
  const db = createAdminClient();
  const { data: cur } = await db.from("premium_access").select("started_at").eq("user_id", p.data.id).eq("program_id", p.data.program).maybeSingle();
  const { error } = await db.from("premium_access").upsert(
    {
      user_id: p.data.id,
      program_id: p.data.program,
      started_at: (cur?.started_at as string | undefined) ?? new Date().toISOString(),
      expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,program_id" },
  );
  if (error || !(await syncPremiumSummary(p.data.id))) return { ok: false, error: "Could not update the expiry. Please try again." };
  await logAudit({ adminId: auth.profile.id, action: "user.premium_expiry_edit", targetType: "profile", targetId: p.data.id, metadata: { program_id: p.data.program, expires_at: expires.toISOString() } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function changeRoleAction(userId: string, role: string): Promise<ActionResult> {
  const auth = await assertAdmin({ superOnly: true });
  if (!auth.ok) return auth;
  const p = z.object({ id: uuid, role: z.enum(USER_ROLES) }).safeParse({ id: userId, role });
  if (!p.success) return { ok: false, error: zodMessage(p.error) };
  if (p.data.id === auth.profile.id) return { ok: false, error: "You cannot change your own role." };
  const { data: cur } = await createAdminClient().from("profiles").select("role").eq("id", p.data.id).maybeSingle();
  if (!(await patchProfile(p.data.id, { role: p.data.role }))) return { ok: false, error: "Could not change the role. Please try again." };
  await logAudit({ adminId: auth.profile.id, action: "user.role_change", targetType: "profile", targetId: p.data.id, metadata: { from: (cur?.role as string) ?? null, to: p.data.role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export interface UserDetail {
  payments: { id: string; amount: number; status: string; payment_method: string; created_at: string }[];
  referredCount: number;
  referrerName: string | null;
}

export async function getUserDetailAction(userId: string): Promise<ActionResult<UserDetail>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const p = uuid.safeParse(userId);
  if (!p.success) return { ok: false, error: "Invalid user." };
  const db = createAdminClient();
  const [pay, refs, prof] = await Promise.all([
    db.from("payments").select("id, amount, status, payment_method, created_at").eq("user_id", p.data).order("created_at", { ascending: false }).limit(10),
    db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", p.data),
    db.from("profiles").select("referred_by").eq("id", p.data).maybeSingle(),
  ]);
  let referrerName: string | null = null;
  const by = prof.data?.referred_by as string | null | undefined;
  if (by) {
    const { data } = await db.from("profiles").select("full_name, email").eq("id", by).maybeSingle();
    referrerName = (data?.full_name as string) || (data?.email as string) || null;
  }
  return {
    ok: true,
    data: { payments: (pay.data ?? []) as UserDetail["payments"], referredCount: refs.count ?? 0, referrerName },
  };
}
