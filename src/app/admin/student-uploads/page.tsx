import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { STUDENT_UPLOAD_STATUSES, type ResourceType, type StudentUploadStatus } from "@/lib/types";
import { CommunityAdminHeader } from "@/components/community/admin-header";
import { UPLOAD_STATUS_META } from "@/components/community/common";
import { FormMessage } from "@/components/community/FormMessage";
import { getSubjectOptions } from "@/components/community/subject-options";
import { StatusNav } from "@/components/community/status-nav";
import { UploadsAdmin, type AdminUploadRow } from "@/components/community/UploadsAdmin";

export const metadata: Metadata = { title: "Student uploads | Admin" };
export const dynamic = "force-dynamic";

interface Raw {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  status: StudentUploadStatus;
  review_note: string | null;
  subject_id: string | null;
  created_at: string;
  subject: { name: string } | null;
  uploader: { full_name: string | null; email: string | null } | null;
}

export default async function AdminStudentUploadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/student-uploads");
  const { status: raw } = await searchParams;
  const status: StudentUploadStatus = (STUDENT_UPLOAD_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as StudentUploadStatus)
    : "PENDING";

  const supabase = await createServerClient();
  const [list, options, ...counts] = await Promise.all([
    supabase
      .from("student_uploads")
      .select(
        "id, title, description, resource_type, status, review_note, subject_id, created_at, subject:subjects(name), uploader:profiles(full_name, email)",
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "PENDING" })
      .limit(200),
    getSubjectOptions(),
    ...STUDENT_UPLOAD_STATUSES.map((s) => supabase.from("student_uploads").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);

  const rows: AdminUploadRow[] = ((list.data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    resource_type: r.resource_type,
    status: r.status,
    review_note: r.review_note,
    subject_id: r.subject_id,
    subject_name: r.subject?.name ?? null,
    uploader: r.uploader?.full_name || r.uploader?.email || "Unknown",
    created_at: r.created_at,
  }));

  return (
    <div>
      <CommunityAdminHeader title="Student uploads" description="Review PDFs submitted by students. Previews use 60-second private links." />
      <StatusNav
        basePath="/admin/student-uploads"
        label="Upload status"
        active={status}
        items={STUDENT_UPLOAD_STATUSES.map((s, i) => ({
          value: s,
          label: UPLOAD_STATUS_META[s].label,
          count: (counts[i] as { count: number | null }).count ?? 0,
        }))}
      />
      {list.error ? (
        <FormMessage kind="error">Could not load uploads. Please refresh.</FormMessage>
      ) : (
        <UploadsAdmin key={status} rows={rows} options={options} />
      )}
    </div>
  );
}
