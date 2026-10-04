"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ROMAN, formatFixed } from "@/lib/scgpa";
import type { SemesterModel } from "./use-calculator";

/**
 * The semester tabs double as a transcript strip: each tab carries a bar whose height is
 * that semester's SGPA on the grading scale, so the whole degree reads at a glance.
 */
export function SemesterStrip({
  models,
  active,
  onSelect,
  scale,
  panelId,
}: {
  models: SemesterModel[];
  active: number;
  onSelect: (n: number) => void;
  scale: number;
  panelId: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = models.findIndex((m) => m.number === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % models.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + models.length) % models.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = models.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const n = models[next].number;
    onSelect(n);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-sem="${n}"]`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Semesters"
      onKeyDown={onKeyDown}
      className="grid grid-cols-8 gap-0.5 rounded-2xl border border-border bg-card/80 p-1 shadow-sm min-[400px]:gap-1 min-[400px]:p-1.5 sm:gap-1.5 sm:p-2"
    >
      {models.map((m) => {
        const selected = m.number === active;
        const sgpa = m.result.sgpa;
        const pct = sgpa === null ? 0 : Math.max(4, Math.min(100, (sgpa / scale) * 100));
        const roman = ROMAN[m.number - 1] ?? String(m.number);
        return (
          <button
            key={m.number}
            type="button"
            role="tab"
            data-sem={m.number}
            id={`sem-tab-${m.number}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(m.number)}
            aria-label={`Semester ${roman}${sgpa === null ? ", no marks yet" : `, SGPA ${formatFixed(sgpa)}`}`}
            className={cn(
              "group relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 pb-1.5 pt-2 outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              selected ? "bg-muted ring-1 ring-inset ring-border-strong" : "hover:bg-muted/60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "font-mono text-[0.625rem] tabular-nums leading-none sm:text-[0.6875rem]",
                sgpa === null ? "text-muted-foreground/60" : selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {sgpa === null ? "—" : formatFixed(sgpa)}
            </span>
            <span aria-hidden className="relative flex h-10 w-2.5 items-end overflow-hidden rounded-full bg-surface-sunken ring-1 ring-inset ring-hairline sm:h-14 sm:w-3">
              <span
                className={cn(
                  "w-full rounded-full motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-out",
                  sgpa === null && "opacity-0",
                )}
                style={{ height: `${pct}%`, backgroundImage: "var(--gradient-brand)" }}
              />
            </span>
            <span
              aria-hidden
              className={cn(
                "text-xs font-semibold tracking-tight sm:text-sm",
                selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
              )}
            >
              {roman}
            </span>
            <span aria-hidden className="hidden font-mono text-[0.625rem] leading-none text-muted-foreground sm:block">
              {m.hasSubjects ? `${m.entered}/${m.listed}` : "·"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
