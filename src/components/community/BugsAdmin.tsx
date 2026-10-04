"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bug, ExternalLink, Trash2 } from "lucide-react";
import { Badge, Card, EmptyState, Select } from "@/components/ui";
import { deleteBugReport, setBugStatus } from "@/lib/actions/bugs";
import { BUG_STATUSES, type BugReport, type BugStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { BUG_STATUS_META } from "./common";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { FormMessage } from "./FormMessage";

export type BugRow = BugReport & { screenshotUrl: string | null; reporter: string | null };

export function BugsAdmin({ bugs }: { bugs: BugRow[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function change(id: string, status: BugStatus) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await setBugStatus(id, status);
      if (!res.ok) setError(res.error);
      setBusyId(null);
      router.refresh();
    });
  }

  if (bugs.length === 0) {
    return <EmptyState icon={<Bug aria-hidden />} title="No bug reports here" description="Reports with this status will appear in this list." />;
  }

  return (
    <div className="space-y-3">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <ul className="space-y-3">
        {bugs.map((b) => (
          <li key={b.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{b.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(b.created_at, { withTime: true })} - {b.reporter ?? "Anonymous"}
                  </p>
                </div>
                <Badge variant={BUG_STATUS_META[b.status].tone} className="self-start">
                  {BUG_STATUS_META[b.status].label}
                </Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{b.description}</p>
              <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-[auto_1fr]">
                {b.page_url && (
                  <>
                    <dt className="font-semibold">Page</dt>
                    <dd className="break-all">{b.page_url}</dd>
                  </>
                )}
                {b.device && (
                  <>
                    <dt className="font-semibold">Device</dt>
                    <dd>{b.device}</dd>
                  </>
                )}
                {b.browser && (
                  <>
                    <dt className="font-semibold">Browser</dt>
                    <dd>{b.browser}</dd>
                  </>
                )}
              </dl>
              {b.screenshotUrl && (
                <a href={b.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.screenshotUrl} alt={`Screenshot for: ${b.title}`} loading="lazy" className="max-h-48 rounded-md border border-border" />
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <ExternalLink aria-hidden className="size-3" /> Open full size
                  </span>
                </a>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <div className="w-44">
                    <Select
                      value={b.status}
                      disabled={busyId === b.id}
                      onChange={(e) => change(b.id, e.target.value as BugStatus)}
                      aria-label={`Status for ${b.title}`}
                    >
                      {BUG_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {BUG_STATUS_META[s].label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </label>
                <div className="ml-auto">
                  <ConfirmActionButton
                    title="Delete this report?"
                    description="The report and its screenshot will be permanently removed."
                    confirmLabel="Delete"
                    variant="danger"
                    action={() => deleteBugReport(b.id)}
                  >
                    <Trash2 aria-hidden /> Delete
                  </ConfirmActionButton>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
