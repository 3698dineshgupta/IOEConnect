"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/ui";
import { COMPONENT_LABELS, type ComponentKey } from "@/lib/scgpa";
import type { RowModel } from "./use-calculator";
import type { EntryDraft } from "./types";

/** Desktop column template shared by the header, every row and the total row. */
export const ROW_COLS = "md:grid-cols-[minmax(0,1.7fr)_3.25rem_repeat(3,minmax(5rem,1fr))_3.25rem_3.75rem]";

const numField = cn(fieldClass, "h-11 w-full scroll-mb-44 px-2 text-center font-mono tabular-nums md:h-10");

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

function Field({
  id,
  label,
  max,
  value,
  error,
  failed,
  onChange,
}: {
  id: string;
  label: string;
  max: number;
  value: string;
  error?: string;
  failed?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || failed ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(numField, failed && !error && "border-danger/50")}
      />
      <p className="mt-1 text-center text-xs tabular-nums text-muted-foreground">/ {max}</p>
    </div>
  );
}

const NA = (
  <div className="flex h-11 items-center justify-center text-muted-foreground/60 md:h-10" aria-label="Not applicable">
    —
  </div>
);

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
  const { subject, result, parts } = row;
  const id = `m-${subject.slug}`;
  const errId = `${id}-err`;
  const max = subject.max;
  const set = (patch: Partial<EntryDraft>) => onChange(subject.slug, patch);
  const failed = new Set<ComponentKey>(result?.parts?.failed ?? []);
  const partErr = Object.values(row.partErrors).find(Boolean);
  const error = row.fullError ?? row.marksError ?? partErr ?? null;
  const capped = result?.parts?.capped ? result.parts : null;

  return (
    <li className="relative px-4 py-4 sm:px-5 md:py-3.5">
      <div className={cn("flex flex-col gap-3.5 md:grid md:items-start md:gap-x-3", ROW_COLS)}>
        {/* Subject + credit */}
        <div className="flex items-start justify-between gap-3 md:contents">
          <div className="min-w-0 flex-1 md:flex-none md:self-center">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-muted-foreground" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              {subject.code && <span className="font-mono text-xs font-medium text-muted-foreground">{subject.code}</span>}
              {row.group && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{row.group}</span>}
            </div>
            <p className="mt-0.5 break-words text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">{subject.name}</p>
            {subject.ltp && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                L-T-P <span className="font-mono">{subject.ltp}</span>
              </p>
            )}
          </div>

          <div className="shrink-0 text-center md:self-center">
            <label htmlFor={`${id}-cr`} className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">
              Credit
            </label>
            <input
              id={`${id}-cr`}
              inputMode="decimal"
              autoComplete="off"
              value={row.entry.credits}
              placeholder={subject.credits === null ? "—" : String(+subject.credits.toFixed(1))}
              onChange={(e) => set({ credits: e.target.value })}
              aria-label={`Credits for ${subject.name} (you can correct this)`}
              title="Credits — tap to correct"
              className="h-9 w-12 rounded-md border border-transparent bg-transparent text-center font-mono text-[0.9375rem] font-semibold tabular-nums text-foreground outline-none placeholder:text-foreground hover:border-border focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </div>

        {/* Theory / Internal / Practical */}
        <div className="grid grid-cols-3 gap-2.5 md:contents">
          {max && parts ? (
            <>
              {max.theory > 0 ? (
                <Field id={`${id}-t`} label="Theory" max={max.theory} value={row.entry.theory} error={row.partErrors.theory} failed={failed.has("theory")} onChange={(v) => set({ theory: v })} />
              ) : (
                <div>
                  <span className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">Theory</span>
                  {NA}
                </div>
              )}
              {max.internal > 0 ? (
                <Field id={`${id}-i`} label="Internal" max={max.internal} value={row.entry.internal} error={row.partErrors.internal} failed={failed.has("internal")} onChange={(v) => set({ internal: v })} />
              ) : (
                <div>
                  <span className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">Internal</span>
                  {NA}
                </div>
              )}
              {max.practical > 0 ? (
                <Field id={`${id}-p`} label="Practical" max={max.practical} value={row.entry.practical} error={row.partErrors.practical} failed={failed.has("practical")} onChange={(v) => set({ practical: v })} />
              ) : (
                <div>
                  <span className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">Practical</span>
                  {NA}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Full marks aren't known for this subject: the student types them, then the total. */}
              <div className="min-w-0">
                <label htmlFor={`${id}-fm`} className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">
                  Full marks
                </label>
                <input
                  id={`${id}-fm`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 100"
                  value={row.entry.fullMarks}
                  onChange={(e) => set({ fullMarks: e.target.value })}
                  aria-invalid={row.fullError ? true : undefined}
                  className={numField}
                />
                <p className="mt-1 text-center text-xs text-muted-foreground">full marks</p>
              </div>
              <div className="min-w-0">
                <label htmlFor={id} className="mb-1 block text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground md:sr-only">
                  Obtained
                </label>
                <input
                  id={id}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={row.fullMarks && !row.fullError ? `/ ${row.fullMarks}` : "—"}
                  value={row.entry.obtained}
                  onChange={(e) => set({ obtained: e.target.value })}
                  aria-invalid={row.marksError ? true : undefined}
                  aria-describedby={error ? errId : undefined}
                  className={numField}
                />
                <p className="mt-1 text-center text-xs text-muted-foreground">obtained</p>
              </div>
              <div>{NA}</div>
            </>
          )}
        </div>

        {/* Grade + points */}
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-border pt-3 md:contents md:border-0 md:pt-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
            <span>Grade</span>
            <GradeStamp grade={result?.grade ?? null} passed={result?.passed ?? false} top={result?.grade === topGrade} />
          </div>
          <div className="hidden md:flex md:h-10 md:items-center md:justify-center">
            <span className="sr-only">Grade</span>
            <GradeStamp grade={result?.grade ?? null} passed={result?.passed ?? false} top={result?.grade === topGrade} />
          </div>
          <div className="text-right md:flex md:h-10 md:items-center md:justify-end">
            <span className="mr-1 text-xs text-muted-foreground md:sr-only">Points</span>
            <span className="font-mono text-[0.9375rem] font-semibold tabular-nums text-foreground">{result ? result.points.toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>

      {/* Explanations: the 20% rule and the 40% pass rule, only when they matter */}
      {(capped || failed.size > 0 || error) && (
        <div className="mt-3 space-y-1.5 text-xs">
          {capped && max && (
            <p className="rounded-md bg-warning-soft px-2.5 py-1.5 font-medium text-warning">
              20% rule: Internal counts as {+capped.internal.toFixed(2)} / {max.internal} (you entered {capped.internalRaw}), because it
              can be at most 20% above your Theory percentage.
            </p>
          )}
          {failed.size > 0 && (
            <p className="rounded-md bg-danger-soft px-2.5 py-1.5 font-medium text-danger">
              Below 40% in {[...failed].map((k) => COMPONENT_LABELS[k]).join(", ")} — failing any component gives an overall F.
            </p>
          )}
          {error && (
            <p id={errId} role="alert" className="font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
