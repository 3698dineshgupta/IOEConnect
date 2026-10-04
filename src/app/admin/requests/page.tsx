import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { REQUEST_STATUSES, type RequestStatus, type ResourceType } from "@/lib/types";
import { CommunityAdminHeader } from "@/components/community/admin-header";
import { REQUEST_STATUS_META } from "@/components/community/common";
import { FormMessage } from "@/components/community/FormMessage";
import { RequestsAdmin, type AdminRequestRow, type LinkableResource } from "@/components/community/RequestsAdmin";
import { StatusNav } from "@/components/community/status-nav";

export const metadata: Metadata = { title: "Requests | Admin" };
export const dynamic = "force-dynamic";

interface Raw {
  id: string;
  subject_id: string | null;
  subject_text: string | null;
  resource_type: ResourceType | null;
  years: string | null;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  subject: { name: string } | null;
  requester: { full_name: string | null; email: string | null } | null;
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/requests");
  const { status: raw } = await searchParams;
  const status: RequestStatus = (REQUEST_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as RequestStatus) : "PENDING";

  const supabase = await createServerClient();
  const [list, ...counts] = await Promise.all([
    supabase
      .from("resource_requests")
      .select(
        "id, subject_id, subject_text, resource_type, years, message, status, admin_note, created_at, subject:subjects(name), requester:profiles(full_name, email)",
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "PENDING" })
      .limit(200),
    ...REQUEST_STATUSES.map((s) => supabase.from("resource_requests").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);

  const raws = (list.data ?? []) as unknown as Raw[];
  const rows: AdminRequestRow[] = raws.map((r) => ({
    id: r.id,
    subject_id: r.subject_id,
    subject_text: r.subject_text,
    subject_name: r.subject?.name ?? null,
    resource_type: r.resource_type,
    years: r.years,
    message: r.message,
    status: r.status,
    admin_note: r.admin_note,
    created_at: r.created_at,
    requester: r.requester?.full_name || r.requester?.email || "Unknown",
  }));

  // Published resources per subject, for the optional "link resource" step.
  const subjectIds = [...new Set(rows.map((r) => r.subject_id).filter((v): v is string => !!v))];
  const resourcesBySubject: Record<string, LinkableResource[]> = {};
  if (status !== "REJECTED" && subjectIds.length) {
    const { data } = await supabase.from("public_resources").select("id, title, subject_id").in("subject_id", subjectIds).limit(1000);
    for (const r of (data ?? []) as { id: string; title: string; subject_id: string }[]) {
      (resourcesBySubject[r.subject_id] ??= []).push({ id: r.id, title: r.title });
    }
  }

  return (
    <div>
      <CommunityAdminHeader title="Resource requests" description="Requests from students, from pending to completed." />
      <StatusNav
        basePath="/admin/requests"
        label="Request status"
        active={status}
        items={REQUEST_STATUSES.map((s, i) => ({ value: s, label: REQUEST_STATUS_META[s].label, count: counts[i].count ?? 0 }))}
      />
      {list.error ? (
        <FormMessage kind="error">Could not load requests. Please refresh.</FormMessage>
      ) : (
        <RequestsAdmin key={status} rows={rows} resourcesBySubject={resourcesBySubject} />
      )}
    </div>
  );
}
