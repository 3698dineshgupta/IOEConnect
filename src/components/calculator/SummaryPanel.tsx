"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Download, LogIn, Save } from "lucide-react";
import { Button, Input, Progress, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ROMAN, formatFixed, type CgpaResult } from "@/lib/scgpa";
import type { SemesterModel } from "./use-calculator";

export interface SummaryActions {
  name: string;
  onNameChange: (v: string) => void;
  onDownload: () => void;
  downloading: boolean;
  canDownload: boolean;
  onSave: () => void;
  saving: boolean;
  signedIn: boolean;
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-border-strong" />
      <dd className="font-mono tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function SummaryPanel({
  active,
  models,
  cgpa,
  scale,
  decimals,
  actions,
}: {
  active: SemesterModel;
  models: SemesterModel[];
  cgpa: CgpaResult;
  scale: number;
  decimals: number;
  actions: SummaryActions;
}) {
  const r = active.result;
  const roman = ROMAN[active.number - 1];
  return (
    <section aria-labelledby="summary-h" className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      <h2 id="summary-h" className="sr-only">Your results</h2>

      {/* SGPA for the selected semester */}
      <div className="relative px-5 pb-5 pt-5">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ backgroundImage: "var(--gradient-brand)" }} />
        <p className="text-xs font-semibold text-muted-foreground">Semester {roman} · SGPA</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums text-foreground">{formatFixed(r.sgpa, decimals)}</span>
          <span className="font-mono text-sm text-muted-foreground">/ {scale.toFixed(decimals)}</span>
        </p>
        <div className="mt-4 space-y-1.5">
          <Progress value={active.entered} max={Math.max(1, active.listed)} label={`Subjects entered in semester ${roman}`} />
          <p className="text-xs text-muted-foreground">
            {active.entered} of {active.listed} subjects entered
            {active.openGroups.length > 0 && ` · ${active.openGroups.length} elective${active.openGroups.length > 1 ? "s" : ""} not chosen`}
          </p>
        </div>
        <dl className="mt-4 space-y-2">
          <Line label="Marks" value={r.sgpa === null ? "—" : `${+r.totalObtained.toFixed(2)} / ${r.totalFullMarks}`} />
          <Line label="Percentage" value={r.percent === null ? "—" : `${r.percent.toFixed(2)}%`} />
        </dl>
      </div>

      {/* CGPA + per-semester list */}
      <div className="border-t border-border bg-surface-sunken/60 px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold text-muted-foreground">CGPA</p>
          <p className="text-xs text-muted-foreground">
            {cgpa.semestersCounted ? `${cgpa.semestersCounted} semester${cgpa.semestersCounted > 1 ? "s" : ""}` : "No semesters yet"}
          </p>
        </div>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums">{formatFixed(cgpa.cgpa, decimals)}</p>
        <ol className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1.5" aria-label="SGPA by semester">
          {models.map((m) => (
            <li key={m.number} className={cn("flex items-baseline gap-2 text-xs", m.number === active.number && "font-semibold")}>
              <span className="w-8 text-muted-foreground">{ROMAN[m.number - 1]}</span>
              <span aria-hidden className="mb-0.5 flex-1 border-b border-dotted border-border" />
              <span className={cn("font-mono tabular-nums", m.result.sgpa === null && "text-muted-foreground/60")}>
                {formatFixed(m.result.sgpa, decimals)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-border px-5 py-5">
        <div>
          <label htmlFor="gs-name" className="text-xs font-semibold text-muted-foreground">
            Name on gradesheet
          </label>
          <Input
            id="gs-name"
            className="mt-1"
            autoComplete="name"
            placeholder="Your full name"
            value={actions.name}
            maxLength={120}
            onChange={(e) => actions.onNameChange(e.target.value)}
          />
        </div>
        <Button className="w-full" size="lg" onClick={actions.onDownload} loading={actions.downloading} disabled={!actions.canDownload}>
          {!actions.downloading && <Download aria-hidden />}
          Download gradesheet
        </Button>
        {!actions.canDownload && (
          <p className="text-center text-xs text-muted-foreground">Enter marks for at least one subject to download.</p>
        )}
        {actions.signedIn ? (
          <Button variant="outline" className="w-full" onClick={actions.onSave} loading={actions.saving}>
            {!actions.saving && <Save aria-hidden />}
            Save marks
          </Button>
        ) : (
          <Link href="/login?next=/calculator" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            <LogIn aria-hidden />
            Log in to save your marks
          </Link>
        )}
      </div>
    </section>
  );
}
