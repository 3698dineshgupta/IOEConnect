"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { DEFAULT_GRADE_BANDS } from "@/lib/scgpa";
import type { SettingsMap } from "@/lib/types";
import { saveSettingAction } from "@/app/admin/settings/actions";

type Row = { grade: string; points: string; min: string };

const toRows = (grades: SettingsMap["scgpa"]["grades"]): Row[] =>
  [...grades]
    .sort((a, b) => b.min_percent - a.min_percent)
    .map((g) => ({ grade: g.grade, points: String(g.points), min: String(g.min_percent) }));

const num = (raw: string) => (raw.trim() === "" ? NaN : Number(raw));

/** Per-row error messages (index -> message) plus a table-level error. */
function validate(rows: Row[]): { rowErrors: Record<number, string>; tableError: string | null } {
  const rowErrors: Record<number, string> = {};
  const grades = new Map<string, number>();
  const mins = new Map<number, number>();
  rows.forEach((r, i) => {
    const g = r.grade.trim().toUpperCase();
    const p = num(r.points);
    const m = num(r.min);
    if (!g) rowErrors[i] = "Enter a grade name.";
    else if (g.length > 4) rowErrors[i] = "Grade names are at most 4 characters.";
    else if (grades.has(g)) rowErrors[i] = `Grade ${r.grade.trim()} is listed twice.`;
    else if (!Number.isFinite(p) || p < 0 || p > 4) rowErrors[i] = "Points must be between 0 and 4.";
    else if (!Number.isFinite(m) || m < 0 || m > 100) rowErrors[i] = "Minimum % must be between 0 and 100.";
    else if (mins.has(m)) rowErrors[i] = `Another grade already starts at ${m}%.`;
    grades.set(g, i);
    if (Number.isFinite(m)) mins.set(m, i);
  });
  const tableError = rows.length === 0 ? "Add at least one grade." : null;
  return { rowErrors, tableError };
}

export function ScgpaTab({ initial }: { initial: SettingsMap["scgpa"] }) {
  const router = useRouter();
  const [scale, setScale] = React.useState(String(initial.scale));
  const [decimals, setDecimals] = React.useState(String(initial.decimals));
  const [minPass, setMinPass] = React.useState(String(initial.min_pass_points));
  const [rows, setRows] = React.useState<Row[]>(() => toRows(initial.grades));
  const [saving, setSaving] = React.useState(false);
  const { rowErrors, tableError } = validate(rows);
  const hasErrors = Object.keys(rowErrors).length > 0 || !!tableError;

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (hasErrors) {
      toast.error(tableError ?? "Fix the highlighted grade rows first.");
      return;
    }
    const grades = rows
      .map((r) => ({ grade: r.grade.trim(), points: num(r.points), min_percent: num(r.min) }))
      .sort((a, b) => b.min_percent - a.min_percent);
    setSaving(true);
    const res = await saveSettingAction("scgpa", {
      scale: num(scale) || 4,
      decimals: Number.isInteger(num(decimals)) ? num(decimals) : 2,
      min_pass_points: Number.isFinite(num(minPass)) ? num(minPass) : 0,
      grades,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("SCGPA settings saved");
      setRows(toRows(grades));
      router.refresh();
    } else toast.error(res.error);
  };

  const lowest = rows.reduce((min, r) => Math.min(min, Number.isFinite(num(r.min)) ? num(r.min) : 100), 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SCGPA calculator</CardTitle>
        <CardDescription>Grade bands used by the public calculator and the downloadable gradesheet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div role="note" className="flex gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            The default bands (A+ ≥ 90 % … D ≥ 40 %, F below) are <strong>unverified placeholders</strong>. Confirm them against the
            official TU/IOE grading rules before relying on the calculator.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="g-scale">Grade scale</Label>
            <Input id="g-scale" type="number" step="any" min={1} max={10} value={scale} onChange={(e) => setScale(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="g-dec">Decimal places</Label>
            <Input id="g-dec" type="number" min={0} max={4} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="g-min">Minimum passing points</Label>
            <Input id="g-min" type="number" step="any" value={minPass} onChange={(e) => setMinPass(e.target.value)} />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Grade bands</legend>
          <p className="mb-3 text-xs text-muted-foreground">
            A subject gets the highest grade whose minimum % it reaches. Marks below every band get the 0-point grade. Saved highest
            first.
          </p>
          <div className="hidden grid-cols-[6rem_7rem_8rem_auto] gap-2 px-0.5 pb-1 text-xs font-medium text-muted-foreground sm:grid">
            <span>Grade</span>
            <span>Points</span>
            <span>Minimum %</span>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const err = rowErrors[i];
              const errId = `g-row-err-${i}`;
              const label = r.grade.trim() || `grade ${i + 1}`;
              return (
                <li key={i}>
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 sm:grid-cols-[6rem_7rem_8rem_auto]">
                    <Input aria-label={`Grade name, row ${i + 1}`} value={r.grade} maxLength={4} onChange={(e) => setRow(i, { grade: e.target.value })} aria-invalid={!!err || undefined} aria-describedby={err ? errId : undefined} />
                    <Input aria-label={`Points for ${label}`} type="number" step="0.1" min={0} max={4} value={r.points} onChange={(e) => setRow(i, { points: e.target.value })} aria-invalid={!!err || undefined} />
                    <Input aria-label={`Minimum percent for ${label}`} type="number" step="any" min={0} max={100} value={r.min} onChange={(e) => setRow(i, { min: e.target.value })} aria-invalid={!!err || undefined} />
                    <Button size="sm" variant="ghost" aria-label={`Remove ${label}`} disabled={rows.length <= 1} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  {err && <p id={errId} className="mt-1 text-xs font-medium text-danger">{err}</p>}
                </li>
              );
            })}
          </ul>
          {tableError && <p className="mt-2 text-xs font-medium text-danger">{tableError}</p>}
          {!tableError && lowest > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">No band starts at 0 %, so marks below {lowest} % will show as F with 0 points.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { grade: "", points: "0", min: "" }])} disabled={rows.length >= 20}>
              <Plus aria-hidden /> Add grade
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRows(toRows(DEFAULT_GRADE_BANDS.map((b) => ({ ...b }))))}>
              <RotateCcw aria-hidden /> Reset to defaults
            </Button>
          </div>
        </fieldset>
      </CardContent>
      <div className="flex justify-end border-t border-border p-4">
        <Button loading={saving} onClick={save}>Save SCGPA settings</Button>
      </div>
    </Card>
  );
}
