import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE_LABELS, type ResourceType, type StudentUploadStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { UPLOAD_STATUS_META } from "@/components/community/common";
import { getShellUser } from "@/components/community/shell-user";
import { getSubjectOptions } from "@/components/community/subject-options";
import { UploadForm } from "@/components/community/UploadForm";
import { WithdrawUploadButton } from "@/components/community/WithdrawButtons";
import { FormMessage } from "@/components/community/FormMessage";

export const metadata: Metadata = { title: "My uploads", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  status: StudentUploadStatus;
  review_note: string | null;
  created_at: string;
  subject: { name: string; slug: string } | null;
}

export default async function MyUploadsPage() {
  const { user } = await requireUser("/my-uploads");
  const [shellUser, settings, options] = await Promise.all([getShellUser(), getSetting("resources"), getSubjectOptions()]);

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("student_uploads")
    .select("id, title, description, resource_type, status, review_note, created_at, subject:subjects(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <PublicShell user={shellUser}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My uploads</h1>
        <p className="mt-2 text-muted-foreground">
          Share your notes and past questions with other students. Every upload is reviewed before it is published.
        </p>

        <Card className="mt-8 p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Upload a PDF</h2>
          {!settings.allow_student_uploads ? (
            <FormMessage kind="error">Student uploads are temporarily turned off. Please check back later.</FormMessage>
          ) : options.length === 0 ? (
            <FormMessage kind="error">The subject list is not available yet. Please try again later.</FormMessage>
          ) : (
            <UploadForm userId={user.id} options={options} maxMb={settings.max_upload_mb} />
          )}
        </Card>

        <h2 className="mb-4 mt-10 text-lg font-semibold">Your submissions</h2>
        {error ? (
          <FormMessage kind="error">We could not load your uploads. Please refresh the page.</FormMessage>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Upload aria-hidden />} title="No uploads yet" description="When you submit a PDF it will show up here with its review status." />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const meta = UPLOAD_STATUS_META[r.status];
              return (
                <li key={r.id}>
                  <Card className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="break-words font-semibold">{r.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {r.subject ? (
                              <Link href={`/subject/${r.subject.slug}`} className="hover:underline">
                                {r.subject.name}
                              </Link>
                            ) : (
                              "No subject"
                            )}
                            {" - "}
                            {RESOURCE_TYPE_LABELS[r.resource_type]}
                            {" - "}
                            {formatDate(r.created_at)}
                          </p>
                          {r.description && <p className="mt-2 whitespace-pre-line break-words text-sm">{r.description}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={meta.tone}>{meta.label}</Badge>
                        {r.status === "PENDING" && <WithdrawUploadButton id={r.id} />}
                      </div>
                    </div>
                    {r.review_note && (
                      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="font-semibold">Reviewer note: </span>
                        <span className="whitespace-pre-line break-words">{r.review_note}</span>
                      </p>
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
