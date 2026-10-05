import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MessageSquarePlus } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE_LABELS, type RequestStatus, type ResourceType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { REQUEST_STATUS_META, parseAdminNote } from "@/components/community/common";
import { getShellUser } from "@/components/community/shell-user";
import { getSubjectOptions } from "@/components/community/subject-options";
import { RequestForm } from "@/components/community/RequestForm";
import { RequestTracker } from "@/components/community/RequestTracker";
import { CancelRequestButton } from "@/components/community/WithdrawButtons";
import { FormMessage } from "@/components/community/FormMessage";

export const metadata: Metadata = { title: "My requests", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  subject_text: string | null;
  resource_type: ResourceType | null;
  years: string | null;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  subject: { name: string; slug: string } | null;
}

export default async function MyRequestsPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { user } = await requireUser("/my-requests");
  const { subject: subjectSlug } = await searchParams;
  const [shellUser, settings, options] = await Promise.all([getShellUser(), getSetting("resources"), getSubjectOptions()]);
  const initialSubjectId =
    typeof subjectSlug === "string" ? options.find((o) => o.slug === subjectSlug.toLowerCase())?.id : undefined;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("resource_requests")
    .select("id, subject_text, resource_type, years, message, status, admin_note, created_at, subject:subjects(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <PublicShell user={shellUser}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My requests</h1>
        <p className="mt-2 text-muted-foreground">
          Can&apos;t find a note or past question? Ask for it and we will try to add it.
        </p>

        <Card className="mt-8 p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">New request</h2>
          {!settings.allow_requests ? (
            <FormMessage kind="error">Resource requests are temporarily turned off. Please check back later.</FormMessage>
          ) : (
            <RequestForm key={initialSubjectId ?? "none"} options={options} initialSubjectId={initialSubjectId} />
          )}
        </Card>

        <h2 className="mb-4 mt-10 text-lg font-semibold">Your requests</h2>
        {error ? (
          <FormMessage kind="error">We could not load your requests. Please refresh the page.</FormMessage>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MessageSquarePlus aria-hidden />}
            title="No requests yet"
            description="Your requests and their progress will appear here."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const meta = REQUEST_STATUS_META[r.status];
              const note = parseAdminNote(r.admin_note);
              return (
                <li key={r.id}>
                  <Card className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{r.subject?.name ?? r.subject_text ?? "Unknown subject"}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {r.resource_type ? RESOURCE_TYPE_LABELS[r.resource_type] : "Any type"}
                          {r.years ? ` - ${r.years}` : ""}
                          {" - "}
                          {formatDate(r.created_at)}
                        </p>
                        {r.message && <p className="mt-2 whitespace-pre-line break-words text-sm">{r.message}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={meta.tone}>{meta.label}</Badge>
                        {r.status === "PENDING" && <CancelRequestButton id={r.id} />}
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <RequestTracker status={r.status} />
                    </div>
                    {note.text && (
                      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="font-semibold">Admin note: </span>
                        <span className="whitespace-pre-line break-words">{note.text}</span>
                      </p>
                    )}
                    {note.resource && (
                      <Link
                        href={`/subject/${note.resource.subjectSlug}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        <ExternalLink aria-hidden className="size-4" /> View: {note.resource.title}
                      </Link>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PublicShell>
  );
}
