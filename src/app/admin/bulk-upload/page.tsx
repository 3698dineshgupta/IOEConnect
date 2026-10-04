import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_PUBLIC_COLUMNS, type PublicResource } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/page-header";
import { BulkUpload } from "@/components/admin/bulk-upload";
import type { BulkProgram, ExistingByType } from "@/components/admin/bulk-types";

export const metadata: Metadata = { title: "Bulk upload" };

export default async function AdminBulkUploadPage() {
  await requireAdmin("/admin/bulk-upload");
  const [settings, list] = await Promise.all([getSetting("resources"), getPrograms()]);
  const trees = (await Promise.all(list.map((p) => getProgramTree(p.slug)))).filter((t): t is NonNullable<typeof t> => !!t);

  const programs: BulkProgram[] = trees.map((t) => ({
    slug: t.slug,
    name: t.short_name ? `${t.name} (${t.short_name})` : t.name,
    subjects: t.years.flatMap((y) =>
      y.semesters.flatMap((s) => s.subjects.map((x) => ({ id: x.id, slug: x.slug, name: x.name, code: x.code, semesterNumber: s.number, programSlug: t.slug }))),
    ),
  }));
  // CSE first (the default), then the rest in program order.
  programs.sort((a, b) => Number(b.slug === "cse") - Number(a.slug === "cse"));

  // Public columns only (never Telegram columns). Failed rows do not count as an existing resource.
  const supabase = await createServerClient();
  const { data, error } = await supabase.from("resources").select(RESOURCE_PUBLIC_COLUMNS).in("resource_type", ["SYLLABUS", "PYQ", "NOTES"]).limit(10000);
  if (error) console.error("[admin/bulk-upload] load resources failed", error);
  const rows = ((data ?? []) as unknown as PublicResource[]).filter((x) => x.status !== "FAILED").sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1));
  // Oldest first, so the last entry per subject is the most recently updated one (the one to replace).
  const existingByType: ExistingByType = { SYLLABUS: [], PYQ: [], NOTES: [] };
  for (const r of rows) {
    if (r.resource_type === "SYLLABUS" || r.resource_type === "PYQ" || r.resource_type === "NOTES") existingByType[r.resource_type].push({ id: r.id, subjectId: r.subject_id, title: r.title });
  }

  return (
    <>
      <AdminPageHeader
        title="Bulk upload"
        description="Upload many PDFs at once: syllabi, past questions or notes. Each file is matched to a subject of the chosen program, you review the matches, then they upload one at a time."
      />
      <BulkUpload programs={programs} existingByType={existingByType} maxMb={settings.max_upload_mb} />
    </>
  );
}
