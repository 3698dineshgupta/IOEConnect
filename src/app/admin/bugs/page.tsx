import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { BUG_STATUSES, type BugReport, type BugStatus } from "@/lib/types";
import { CommunityAdminHeader } from "@/components/community/admin-header";
import { BUG_STATUS_META } from "@/components/community/common";
import { BugsAdmin, type BugRow } from "@/components/community/BugsAdmin";
import { FormMessage } from "@/components/community/FormMessage";
import { StatusNav } from "@/components/community/status-nav";

export const metadata: Metadata = { title: "Bug reports | Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBugsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/bugs");
  const { status: raw } = await searchParams;
  const status: BugStatus = (BUG_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as BugStatus) : "OPEN";

  const supabase = await createServerClient();
  const [list, ...counts] = await Promise.all([
    supabase.from("bug_reports").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100),
    ...BUG_STATUSES.map((s) => supabase.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);

  const reports = (list.data ?? []) as BugReport[];

  // Screenshots live in a private bucket: sign short-lived URLs server-side.
  const shotPaths = reports.map((b) => b.screenshot_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (shotPaths.length) {
    const { data: signed, error } = await createAdminClient().storage.from("bug-screenshots").createSignedUrls(shotPaths, 300);
    if (error) console.error("[admin/bugs] sign urls failed", error);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  // Reporter names (admins can read profiles).
  const userIds = [...new Set(reports.map((b) => b.user_id).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      names.set(p.id, p.full_name || p.email || "User");
    }
  }

  const rows: BugRow[] = reports.map((b) => ({
    ...b,
    screenshotUrl: b.screenshot_path ? (urlByPath.get(b.screenshot_path) ?? null) : null,
    reporter: b.user_id ? (names.get(b.user_id) ?? "User") : null,
  }));

  return (
    <div>
      <CommunityAdminHeader title="Bug reports" description="Track reported problems from open to closed." />
      <StatusNav
        basePath="/admin/bugs"
        label="Bug status"
        active={status}
        items={BUG_STATUSES.map((s, i) => ({ value: s, label: BUG_STATUS_META[s].label, count: counts[i].count ?? 0 }))}
      />
      {list.error ? <FormMessage kind="error">Could not load bug reports. Please refresh.</FormMessage> : <BugsAdmin bugs={rows} />}
    </div>
  );
}
