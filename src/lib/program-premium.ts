import "server-only";

import { cache } from "react";
import { createAdminClient, createStaticClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Premium is bought per program: a purchase for CSE does not open Civil, BEX, BEL or BME.
 * premium_access holds one row per (user, program). A subject shared between programs
 * (subjects.share_group) is open to premium members of ANY program that shares it, because its
 * notes and past questions are the same documents.
 *
 * If premium_access doesn't exist yet (migration 20261005000011 not applied) the account-wide
 * premium flag is used so nobody is locked out before the migration is run.
 */

export interface ProgramAccess {
  programId: string;
  startedAt: string;
  expiresAt: string;
}

/** Active (unexpired) per-program premium of a user; `legacy` = table missing, fall back to the account flag. */
export const getProgramAccess = cache(async (userId: string): Promise<{ legacy: boolean; programs: ProgramAccess[] }> => {
  const { data, error } = await createAdminClient()
    .from("premium_access")
    .select("program_id, started_at, expires_at")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString());
  if (error) {
    // 42P01 / PGRST205: relation not found -> migration not applied yet.
    if (error.code === "42P01" || error.code === "PGRST205") return { legacy: true, programs: [] };
    console.error("[program-premium] premium_access read failed", error.message);
    return { legacy: false, programs: [] };
  }
  return {
    legacy: false,
    programs: (data ?? []).map((r) => ({
      programId: r.program_id as string,
      startedAt: r.started_at as string,
      expiresAt: r.expires_at as string,
    })),
  };
});

type SubjectRow = { semester: { year: { program_id: string } | null } | null };
const programOf = (r: SubjectRow) => r.semester?.year?.program_id ?? null;

/** Program of a subject plus the programs of its same-course twins (same share_group). */
export const getSubjectProgramIds = cache(async (subjectId: string): Promise<string[]> => {
  const client = createStaticClient();
  const select = "share_group, semester:semesters(year:years(program_id))";
  const me = await client.from("subjects").select(select).eq("id", subjectId).maybeSingle();
  if (me.error || !me.data) return [];
  const row = me.data as unknown as SubjectRow & { share_group: string | null };
  const ids = new Set<string>();
  const own = programOf(row);
  if (own) ids.add(own);
  if (row.share_group) {
    const mates = await client.from("subjects").select("semester:semesters(year:years(program_id))").eq("share_group", row.share_group);
    if (!mates.error) for (const m of (mates.data ?? []) as unknown as SubjectRow[]) {
      const p = programOf(m);
      if (p) ids.add(p);
    }
  }
  return [...ids];
});

/** Whether `profile` holds active premium for the program(s) this subject belongs to. Admins are handled by callers. */
export async function hasPremiumForSubject(
  profile: Pick<Profile, "id" | "is_premium" | "premium_expires_at"> | null | undefined,
  subjectId: string,
): Promise<boolean> {
  if (!profile) return false;
  const access = await getProgramAccess(profile.id);
  if (access.legacy) {
    return !!profile.is_premium && !!profile.premium_expires_at && new Date(profile.premium_expires_at).getTime() > Date.now();
  }
  if (!access.programs.length) return false;
  const subjectPrograms = await getSubjectProgramIds(subjectId);
  return access.programs.some((a) => subjectPrograms.includes(a.programId));
}

/** `profile` with the premium decision for this subject attached, for access.ts. Null stays null. */
export async function scopeProfileToSubject<P extends Pick<Profile, "id" | "is_premium" | "premium_expires_at">>(
  profile: P | null,
  subjectId: string,
): Promise<(P & { scoped_premium: boolean }) | null> {
  if (!profile) return null;
  return { ...profile, scoped_premium: await hasPremiumForSubject(profile, subjectId) };
}
