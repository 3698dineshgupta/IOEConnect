"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/ui";
import type { RowModel } from "./use-calculator";
import type { EntryDraft } from "./types";

const numField = cn(fieldClass, "h-11 scroll-mb-44 px-2 text-right font-mono tabular-nums sm:px-2.5 md:h-10 md:scroll-mb-0");

/** Grade "stamp": failing grades in danger, the top band highlighted, others quiet. */
export function GradeStamp({ grade, passed, top }: { grade: string | null; passed: boolean; top: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 min-w-10 items-center justify-center rounded-md px-1.5 font-mono text-sm font-semibold ring-1 ring-inset",
        grade === null && "text-muted-foreground/50 ring-border",
        grade !== null && !passed && "bg-danger-soft text-danger ring-danger/20",
        grade !== null && passed && top && "bg-primary-soft text-primary ring-primary/20",
        grade !== null && passed && !top && "bg-muted text-foreground ring-border",
      )}
    >
      {grade ?? "—"}
    </span>
  );
}

export function SubjectRow({
  row,
  topGrade,
  onChange,
  index,
}: {
  row: RowModel;
  topGrade: string;
  onChange: (slug: string, patch: Partial<EntryDraft>) => void;
  index: number;
}) {
  const { subject, result } = row;
  const id = `m-${subject.slug}`;
  const errId = `${id}-err`;
  const fullId = `fm-${subject.slug}`;
  const needsFull = subject.fullMarks == null;
  const error = row.fullError ?? row.marksError;

  return (
    <li className="group/row relative grid grid-cols-[minmax(3.25rem,auto)_minmax(0,1fr)_3.25rem_auto] items-end gap-x-2.5 gap-y-2 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_4rem_6.5rem] md:items-center md:gap-x-3 md:py-4">
      {/* Subject */}
      <div className="col-span-4 min-w-0 md:col-span-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground" aria-hidden>
            {String(index + 1).padStart(2, "0")}
          </span>
          {subject.code && <span className="font-mono text-xs font-medium text-muted-foreground">{subject.code}</span>}
          {row.group && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{row.group}</span>
          )}
        </div>
        <p className="mt-0.5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground break-words">{subject.name}</p>
        {subject.ltp && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            L-T-P <span className="font-mono">{subject.ltp}</span>
          </p>
        )}
      </div>

      {/* Full marks */}
      <div className="flex flex-col gap-1 md:items-end">
        {needsFull ? (
          <>
            <label htmlFor={fullId} className="text-xs font-medium text-muted-foreground">
              Full marks
            </label>
            <input
              id={fullId}
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="e.g. 100"
              value={row.entry.fullMarks}
              onChange={(e) => onChange(subject.slug, { fullMarks: e.target.value })}
              aria-invalid={row.fullError ? true : undefined}
              aria-describedby={row.fullError ? errId : undefined}
              className={cn(numField, "w-20 md:w-full")}
            />
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-muted-foreground md:sr-only">Full marks</span>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              <span className="sr-only">Full marks </span>
              {subject.fullMarks}
            </span>
          </>
        )}
      </div>

      {/* Obtained */}
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground md:sr-only">
          Marks obtained<span className="sr-only"> in {subject.name}</span>
        </label>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={row.fullMarks && !row.fullError ? `/ ${row.fullMarks}` : "—"}
          value={row.entry.obtained}
          onChange={(e) => onChange(subject.slug, { obtained: e.target.value })}
          aria-invalid={row.marksError ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(numField, "w-full")}
        />
      </div>

      {/* Percent */}
      <div className="flex flex-col gap-1 md:items-end">
        <span className="text-xs font-medium text-muted-foreground md:sr-only">Percent</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {result ? `${result.percent.toFixed(1)}%` : <span className="text-muted-foreground/50">—</span>}
        </span>
      </div>

      {/* Grade + points */}
      <div className="flex items-center gap-2 md:justify-end">
        <span className="sr-only">Grade</span>
        <GradeStamp grade={result?.grade ?? null} passed={result?.passed ?? false} top={result?.grade === topGrade} />
        <span className="w-9 text-right font-mono text-sm tabular-nums text-muted-foreground">
          <span className="sr-only">Grade points </span>
          {result ? result.points.toFixed(1) : "—"}
        </span>
      </div>

      {error && (
        <p id={errId} role="alert" className="col-span-4 text-xs font-medium text-danger md:col-span-5 md:text-right">
          {error}
        </p>
      )}
    </li>
  );
}
