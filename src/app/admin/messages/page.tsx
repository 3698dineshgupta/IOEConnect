import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from "@/lib/types";
import { CommunityAdminHeader } from "@/components/community/admin-header";
import { CONTACT_STATUS_META } from "@/components/community/common";
import { FormMessage } from "@/components/community/FormMessage";
import { MessagesAdmin } from "@/components/community/MessagesAdmin";
import { StatusNav } from "@/components/community/status-nav";

export const metadata: Metadata = { title: "Messages | Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("/admin/messages");
  const { status: raw } = await searchParams;
  const status: ContactStatus = (CONTACT_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as ContactStatus) : "UNREAD";

  const supabase = await createServerClient();
  const [list, ...counts] = await Promise.all([
    supabase.from("contact_messages").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200),
    ...CONTACT_STATUSES.map((s) => supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);

  return (
    <div>
      <CommunityAdminHeader title="Messages" description="Contact form submissions from visitors and students." />
      <StatusNav
        basePath="/admin/messages"
        label="Message status"
        active={status}
        items={CONTACT_STATUSES.map((s, i) => ({ value: s, label: CONTACT_STATUS_META[s].label, count: counts[i].count ?? 0 }))}
      />
      {list.error ? (
        <FormMessage kind="error">Could not load messages. Please refresh.</FormMessage>
      ) : (
        <MessagesAdmin key={status} messages={(list.data ?? []) as ContactMessage[]} />
      )}
    </div>
  );
}
