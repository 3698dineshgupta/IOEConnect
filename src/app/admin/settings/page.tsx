import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/server";
import type { PremiumPlan } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsTabs, type AuditRow } from "@/components/admin/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const db = createAdminClient();
  const [settings, plansRes, auditRes] = await Promise.all([
    getAllSettings(),
    db.from("premium_plans").select("*").order("sort_order", { ascending: true }),
    db.from("audit_logs").select("id, admin_id, action, target_type, target_id, metadata, created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  if (plansRes.error) console.error("[admin/settings] plans load failed", plansRes.error);
  if (auditRes.error) console.error("[admin/settings] audit load failed", auditRes.error);

  const logs = (auditRes.data ?? []) as { id: string; admin_id: string | null; action: string; target_type: string | null; target_id: string | null; metadata: Record<string, unknown> | null; created_at: string }[];
  const adminIds = [...new Set(logs.map((l) => l.admin_id).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (adminIds.length) {
    const { data } = await db.from("profiles").select("id, full_name, email").in("id", adminIds);
    for (const p of (data ?? []) as { id: string; full_name: string | null; email: string | null }[]) names.set(p.id, p.full_name || p.email || "Admin");
  }
  const audit: AuditRow[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    target_type: l.target_type,
    target_id: l.target_id,
    created_at: l.created_at,
    admin: l.admin_id ? (names.get(l.admin_id) ?? "Admin") : null,
    metadata: l.metadata ?? {},
  }));

  // Short-lived signed URLs so the private QR images can be previewed.
  const qrUrls: Record<string, string | null> = {};
  await Promise.all(
    settings.payment.methods.map(async (m) => {
      if (!m.qr_path) return void (qrUrls[m.id] = null);
      const { data } = await db.storage.from("site-assets").createSignedUrl(m.qr_path, 3600);
      qrUrls[m.id] = data?.signedUrl ?? null;
    }),
  );

  return (
    <>
      <AdminPageHeader title="Settings" description="Site details, premium plans, payment accounts, limits and the audit log." />
      <SettingsTabs settings={settings} plans={(plansRes.data ?? []) as PremiumPlan[]} qrUrls={qrUrls} audit={audit} />
    </>
  );
}
