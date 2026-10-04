"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { logAudit } from "@/lib/audit";
import { deleteTelegramMessage } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/server";
import { assertAdmin, type ActionResult } from "@/components/admin/guard";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Programs, years, semesters and subjects are cached for up to an hour. After adding a program or
 * subjects through the SQL editor (e.g. seed_civil.sql) nothing else clears that cache, so this lets
 * an admin refresh it on demand.
 */
export async function refreshCurriculumAction(): Promise<ActionResult> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  revalidateTag("curriculum", { expire: 0 });
  revalidateTag("resources", { expire: 0 });
  revalidatePath("/admin/bulk-upload");
  revalidatePath("/resources", "layout");
  return { ok: true };
}

/** Ids of every subject in a program (program -> years -> semesters -> subjects), or null on a lookup error. */
async function programSubjectIds(db: ReturnType<typeof createAdminClient>, programSlug: string): Promise<{ name: string; ids: string[] } | null> {
  const { data: program, error } = await db.from("programs").select("id, name").eq("slug", programSlug).maybeSingle();
  if (error) return null;
  if (!program) return { name: programSlug, ids: [] };
  const { data: years, error: yErr } = await db.from("years").select("id").eq("program_id", program.id);
  if (yErr) return null;
  const yearIds = (years ?? []).map((y) => y.id as string);
  if (!yearIds.length) return { name: String(program.name), ids: [] };
  const { data: sems, error: sErr } = await db.from("semesters").select("id").in("year_id", yearIds);
  if (sErr) return null;
  const semIds = (sems ?? []).map((s) => s.id as string);
  if (!semIds.length) return { name: String(program.name), ids: [] };
  const { data: subs, error: subErr } = await db.from("subjects").select("id").in("semester_id", semIds);
  if (subErr) return null;
  return { name: String(program.name), ids: (subs ?? []).map((s) => s.id as string) };
}

/**
 * Permanently delete every SYLLABUS resource of ONE program (resources whose subject belongs to it):
 * the Telegram copy of each file (best effort) and the database row. Other programs and other resource
 * types are never touched. Admin-only; re-checked server-side.
 */
export async function deleteAllSyllabiAction(programSlug: string): Promise<ActionResult<{ deleted: number; telegramRemoved: number; telegramKept: number }>> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  if (typeof programSlug !== "string" || !SLUG_RE.test(programSlug)) return { ok: false, error: "Choose a program first. Nothing was deleted." };

  const db = createAdminClient();
  const program = await programSubjectIds(db, programSlug);
  if (!program) {
    console.error("[admin/bulk-upload] program lookup failed", programSlug);
    return { ok: false, error: "Could not load the program's subjects. Nothing was deleted." };
  }
  if (!program.ids.length) return { ok: true, data: { deleted: 0, telegramRemoved: 0, telegramKept: 0 } };

  const { data, error } = await db.from("resources").select("id, title, telegram_message_id").eq("resource_type", "SYLLABUS").in("subject_id", program.ids);
  if (error) {
    console.error("[admin/bulk-upload] list syllabi failed", error);
    return { ok: false, error: "Could not load the existing syllabi. Nothing was deleted." };
  }
  const rows = data ?? [];
  if (rows.length === 0) return { ok: true, data: { deleted: 0, telegramRemoved: 0, telegramKept: 0 } };

  // Remove the stored files first. A Telegram failure must not block the delete
  // (Telegram refuses to delete messages older than 48h), but it is reported.
  let telegramRemoved = 0;
  for (const r of rows) {
    const id = r.telegram_message_id ? Number(r.telegram_message_id) : null;
    if (id && (await deleteTelegramMessage(id))) telegramRemoved++;
  }

  const ids = rows.map((r) => r.id as string);
  const { error: delError } = await db.from("resources").delete().in("id", ids).eq("resource_type", "SYLLABUS").in("subject_id", program.ids);
  if (delError) {
    console.error("[admin/bulk-upload] delete syllabi failed", delError);
    return { ok: false, error: "Could not delete the syllabi. Please try again." };
  }

  await logAudit({
    adminId: auth.profile.id,
    action: "resource.bulk_delete_syllabi",
    targetType: "resource",
    targetId: null,
    metadata: { program: programSlug, count: ids.length, telegram_removed: telegramRemoved, titles: rows.slice(0, 100).map((r) => String(r.title)) },
  });

  revalidateTag("resources", { expire: 0 });
  revalidatePath("/admin/resources");
  revalidatePath("/admin/bulk-upload");
  return { ok: true, data: { deleted: ids.length, telegramRemoved, telegramKept: rows.length - telegramRemoved } };
}
