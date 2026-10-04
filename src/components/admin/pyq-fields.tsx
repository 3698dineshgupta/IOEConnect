"use client";

import * as React from "react";
import { Checkbox, Input, Label } from "@/components/ui";

/** Bikram Sambat years offered for past-question papers (plus any already stored on the resource). */
const BASE_YEARS = Array.from({ length: 16 }, (_, i) => 2083 - i);

export type PageRanges = Record<string, [number, number]>;

export function yearOptions(extra: number[] = []): number[] {
  return Array.from(new Set([...BASE_YEARS, ...extra])).sort((a, b) => b - a);
}

/** Checkbox grid of available years. */
export function YearCheckboxes({ value, onChange, extra }: { value: number[]; onChange: (v: number[]) => void; extra?: number[] }) {
  const options = yearOptions([...(extra ?? []), ...value]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Available years</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {options.map((y) => {
          const checked = value.includes(y);
          return (
            <label key={y} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm hover:bg-muted">
              <Checkbox
                checked={checked}
                onChange={(e) => onChange(e.target.checked ? [...value, y].sort((a, b) => b - a) : value.filter((v) => v !== y))}
              />
              {y}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Per-year page range editor (start and end page of each year inside the PDF). */
export function PageRangesEditor({
  years,
  value,
  onChange,
  pageCount,
}: {
  years: number[];
  value: PageRanges;
  onChange: (v: PageRanges) => void;
  pageCount?: number | null;
}) {
  if (!years.length) return null;
  const set = (y: number, idx: 0 | 1, raw: string) => {
    const n = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
    const cur = value[String(y)] ?? [0, 0];
    const next: [number, number] = idx === 0 ? [n, cur[1]] : [cur[0], n];
    onChange({ ...value, [String(y)]: next });
  };
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Page range per year</legend>
      <p className="mb-2 text-xs text-muted-foreground">
        Pages where each year&apos;s paper starts and ends{pageCount ? ` (PDF has ${pageCount} pages)` : ""}. Leave both empty to skip a year.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...years].sort((a, b) => b - a).map((y) => {
          const r = value[String(y)];
          const bad = r && r[0] > 0 && r[1] > 0 && (r[0] > r[1] || (pageCount ? r[1] > pageCount : false));
          return (
            <div key={y} className="flex items-center gap-2 rounded-md border border-border p-2">
              <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{y}</span>
              <div className="flex-1">
                <Label htmlFor={`pr-s-${y}`} className="sr-only">Start page for {y}</Label>
                <Input id={`pr-s-${y}`} type="number" min={1} inputMode="numeric" placeholder="From" value={r?.[0] || ""} aria-invalid={bad || undefined} onChange={(e) => set(y, 0, e.target.value)} />
              </div>
              <span aria-hidden className="text-muted-foreground">to</span>
              <div className="flex-1">
                <Label htmlFor={`pr-e-${y}`} className="sr-only">End page for {y}</Label>
                <Input id={`pr-e-${y}`} type="number" min={1} inputMode="numeric" placeholder="To" value={r?.[1] || ""} aria-invalid={bad || undefined} onChange={(e) => set(y, 1, e.target.value)} />
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Drop incomplete rows and rows for unselected years. Returns an error message when a range is invalid. */
export function cleanRanges(years: number[], value: PageRanges, pageCount?: number | null): { ranges: PageRanges; error?: string } {
  const out: PageRanges = {};
  for (const y of years) {
    const r = value[String(y)];
    if (!r || (!r[0] && !r[1])) continue;
    if (!r[0] || !r[1]) return { ranges: out, error: `Enter both a start and end page for ${y}.` };
    if (r[0] > r[1]) return { ranges: out, error: `${y}: start page is after the end page.` };
    if (pageCount && r[1] > pageCount) return { ranges: out, error: `${y}: end page is beyond the PDF's ${pageCount} pages.` };
    out[String(y)] = [r[0], r[1]];
  }
  return { ranges: out };
}
