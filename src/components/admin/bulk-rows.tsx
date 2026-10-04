"use client";

import Link from "next/link";
import { CheckCircle2, Clock, RotateCcw, Scissors, XCircle } from "lucide-react";
import { Badge, Button, Checkbox, Select, Spinner } from "@/components/ui";
import { formatBytes } from "@/lib/utils";
import { estimateParts } from "@/lib/pdf-split-limits";
import type { BulkSubject } from "./bulk-matching";
import { errorHint } from "./bulk-client";
import type { Row } from "./bulk-types";

const GRID = "md:grid-cols-[1.75rem_minmax(0,1.4fr)_5.5rem_4rem_minmax(0,1.5fr)_minmax(0,1.3fr)]";

export function RowsHeader() {
  return (
    <div aria-hidden className={`hidden grid-cols-[1.75rem_minmax(0,1.4fr)_5.5rem_4rem_minmax(0,1.5fr)_minmax(0,1.3fr)] gap-3 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid`}>
      <span />
      <span>File</span>
      <span>Size</span>
      <span>Pages</span>
      <span>Subject</span>
      <span>Status</span>
    </div>
  );
}

interface Props {
  rows: Row[];
  semesters: [number, BulkSubject[]][];
  /** Subject ids of the selected program (rows targeting another program show their subject as text). */
  programSubjectIds: Set<string>;
  /** Every program's subjects, to label finished rows. */
  subjectById: Map<string, BulkSubject>;
  /** Subjects (single mode) that already have this type, for the "(has …)" option suffix. */
  existing: Set<string>;
  hasLabel: string; // e.g. "has PYQ"
  showTitles: boolean;
  splitAbove: number;
  partMax: number;
  running: boolean;
  onCheck: (key: string, checked: boolean) => void;
  onSubject: (key: string, subjectId: string) => void;
  onRetry: (row: Row) => void;
}

export function RowsList({ rows, semesters, programSubjectIds, subjectById, existing, hasLabel, showTitles, splitAbove, partMax, running, onCheck, onSubject, onRetry }: Props) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => {
        const locked = running || r.status === "done";
        const big = r.file.size > splitAbove;
        const parts = r.partRanges?.length ?? estimateParts(r.file.size, partMax);
        const folder = r.relPath.includes("/") ? r.relPath.slice(0, r.relPath.lastIndexOf("/")) : "";
        return (
          <li key={r.key} className={`grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-3 ${GRID} md:items-center`}>
            <Checkbox aria-label={`Upload ${r.file.name}`} checked={r.checked} disabled={locked || !r.subjectId} onChange={(e) => onCheck(r.key, e.target.checked)} />
            <div className="min-w-0">
              <p className="wrap-break-word text-sm font-medium">{r.file.name}</p>
              {folder && <p className="wrap-break-word text-xs text-muted-foreground">in {folder}/</p>}
              <p className="text-xs text-muted-foreground md:hidden">
                <span className={big ? "font-semibold text-warning" : "font-semibold text-foreground"}>{formatBytes(r.file.size)}</span> · {r.pages ? `${r.pages} pages` : "counting pages…"}
              </p>
              {showTitles && r.title && <p className="mt-0.5 wrap-break-word text-xs text-muted-foreground">Title: <span className="text-foreground">{r.title}</span></p>}
              {big && (
                <p className="mt-1 flex items-start gap-1.5 text-xs text-warning">
                  <Scissors aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Over 20 MB — will be split into {r.partRanges ? "" : "about "}{parts} parts automatically
                    {r.uploadedParts > 0 && r.status !== "done" ? ` (${r.uploadedParts} uploaded)` : ""}
                  </span>
                </p>
              )}
            </div>
            <span className={`hidden text-sm font-semibold md:block ${big ? "text-warning" : "text-foreground"}`}>{formatBytes(r.file.size)}</span>
            <span className="hidden text-sm text-muted-foreground md:block">{r.pages ?? "…"}</span>
            <div className="col-start-2 md:col-start-auto">
              {r.status === "done" || (r.subjectId && !programSubjectIds.has(r.subjectId)) ? (
                <p className="text-sm">{subjectById.get(r.subjectId)?.name ?? "—"}</p>
              ) : (
                <Select aria-label={`Subject for ${r.file.name}`} value={r.subjectId} disabled={locked} onChange={(e) => onSubject(r.key, e.target.value)}>
                  <option value="">— skip —</option>
                  {semesters.map(([n, list]) => (
                    <optgroup key={n} label={`Semester ${n}`}>
                      {list.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}{existing.has(s.id) ? ` (${hasLabel})` : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              )}
            </div>
            <div className="col-start-2 min-w-0 text-sm md:col-start-auto">
              <StatusCell row={r} disabled={running} onRetry={() => onRetry(r)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusCell({ row, disabled, onRetry }: { row: Row; disabled: boolean; onRetry: () => void }) {
  switch (row.status) {
    case "uploading":
      return <span className="flex items-center gap-2 text-primary"><Spinner className="size-4" label="Uploading" /> {row.stage}</span>;
    case "waiting":
      return <span className="flex items-center gap-2 text-warning"><Clock aria-hidden className="size-4 shrink-0" /> {row.stage}</span>;
    case "queued":
      return <span className="text-muted-foreground">Pending</span>;
    case "cancelled":
      return <span className="text-muted-foreground">Not uploaded (cancelled){row.uploadedParts > 0 ? `, ${row.uploadedParts} part${row.uploadedParts === 1 ? "" : "s"} done` : ""}</span>;
    case "done":
      return (
        <span className="flex flex-wrap items-center gap-2 text-success">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" /> {row.partIds.length > 1 ? `Uploaded in ${row.partIds.length} parts` : "Uploaded"}
          {row.resourceId && <Link href={`/view/${row.resourceId}`} className="font-semibold underline underline-offset-2">View</Link>}
        </span>
      );
    case "failed": {
      const hint = errorHint(row.errorCode);
      return (
        <div role="alert" className="space-y-1.5 text-danger">
          <p className="flex items-start gap-2">
            <XCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">
              {row.error}
              {row.errorCode && <span className="ml-1 font-mono text-xs opacity-80">({row.errorCode})</span>}
            </span>
          </p>
          {hint && <p className="pl-6 text-xs text-foreground">{hint}</p>}
          <Button size="sm" variant="outline" disabled={disabled} onClick={onRetry}>
            <RotateCcw aria-hidden /> {row.uploadedParts > 0 ? `Retry from part ${row.uploadedParts + 1}` : "Retry"}
          </Button>
        </div>
      );
    }
    default: {
      const variant = row.note.startsWith("Already") || row.note.startsWith("Another") || row.note.startsWith("Several") ? "warning" : row.subjectId ? "success" : "neutral";
      return <Badge variant={variant}>{row.note}</Badge>;
    }
  }
}
