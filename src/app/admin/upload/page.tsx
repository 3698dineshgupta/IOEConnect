import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_PUBLIC_COLUMNS, type PublicResource } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UploadWizard, type WizardProgram, type WizardReplace } from "@/components/admin/upload-wizard";

export const metadata: Metadata = { title: "Upload PDF" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminUploadPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin/upload");
  const sp = await searchParams;
  const [programs, settings] = await Promise.all([getPrograms(), getSetting("resources")]);
  const trees = (await Promise.all(programs.map((p) => getProgramTree(p.slug)))).filter((t): t is NonNullable<typeof t> => !!t);

  const wizardPrograms: WizardProgram[] = trees.map((t) => ({
    slug: t.slug,
    name: t.name,
    years: t.years.map((y) => ({
      number: y.number,
      semesters: y.semesters.map((s) => ({ id: s.id, number: s.number, subjects: s.subjects.map((x) => ({ id: x.id, name: x.name })) })),
    })),
  }));

  let replace: WizardReplace | undefined;
  const rid = one(sp.resource);
  if (rid && UUID.test(rid)) {
    const supabase = await createServerClient();
    const { data } = await supabase.from("resources").select(RESOURCE_PUBLIC_COLUMNS).eq("id", rid).maybeSingle();
    const r = data as unknown as PublicResource | null;
    if (r) replace = { id: r.id, title: r.title, subjectId: r.subject_id, resourceType: r.resource_type, accessType: r.access_type, description: r.description };
  }
  const subjectParam = one(sp.subject);

  return (
    <>
      <AdminPageHeader
        title={replace ? "Replace PDF" : "Upload PDF"}
        description="Add notes, past questions and other material in three steps. PDFs are validated, compressed and stored securely."
      />
      <UploadWizard
        programs={wizardPrograms}
        maxMb={settings.max_upload_mb}
        defaultAccess={settings.default_access_type}
        compressionEnabled={settings.compress_pdfs}
        initialSubjectId={subjectParam && UUID.test(subjectParam) ? subjectParam : undefined}
        replace={replace}
      />
    </>
  );
}
