"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ROMAN, formatFixed } from "@/lib/scgpa";
import { SemesterStrip } from "./SemesterStrip";
import { ROW_COLS, SubjectRow } from "./SubjectRow";
import { ElectivePicker } from "./ElectivePicker";
import { SummaryPanel } from "./SummaryPanel";
import { HowCalculated } from "./HowCalculated";
import { useCalculator } from "./use-calculator";
import { buildGradesheetInput } from "./build-gradesheet";
import { choiceKey, type CalculatorProps } from "./types";

const PANEL_ID = "semester-panel";

export default function Calculator(props: CalculatorProps) {
  const { semesters, bands, decimals, signedIn, student, program } = props;
  const { draft, models, cgpa, setEntry, choose, clearSemester, setName } = useCalculator(props);

  const firstWithEntries = models.find((m) => m.entered > 0)?.number;
  const [active, setActive] = React.useState<number>(firstWithEntries ?? models[0]?.number ?? 1);
  const [saving, setSaving] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const model = models.find((m) => m.number === active) ?? models[0];
  const semester = semesters.find((s) => s.number === active);
  const scale = bands.reduce((max, b) => Math.max(max, b.points), 0) || 4;
  const topGrade = [...bands].sort((a, b) => b.points - a.points)[0]?.grade ?? "";
  const anyEntered = models.some((m) => m.entered > 0);
  const roman = ROMAN[active - 1] ?? String(active);
  // Total row: credits and full marks of every listed subject; points = Σ(grade point × credits) of graded ones.
  const totalCredits = (model?.rows ?? []).reduce((a, r) => a + (r.credits ?? 0), 0);
  const totalFull = (model?.rows ?? []).reduce((a, r) => a + (r.fullMarks ?? 0), 0);
  const creditPoints = (model?.rows ?? []).reduce((a, r) => a + (r.result ? r.result.points * (r.credits ?? 0) : 0), 0);

  // Debounced announcement for screen readers (avoids reading every keystroke).
  const liveText = model
    ? `Semester ${roman}: ${model.result.sgpa === null ? "no SGPA yet" : `SGPA ${formatFixed(model.result.sgpa, decimals)}`}, ${model.entered} of ${model.listed} subjects entered.${cgpa.cgpa === null ? "" : ` CGPA ${formatFixed(cgpa.cgpa, decimals)}.`}`
    : "";
  const [announced, setAnnounced] = React.useState("");
  React.useEffect(() => {
    const t = window.setTimeout(() => setAnnounced(liveText), 900);
    return () => window.clearTimeout(t);
  }, [liveText]);

  const handleDownload = async () => {
    if (!anyEntered) return;
    if (!draft.name.trim()) {
      toast.error("Add your name to put it on the gradesheet.");
      document.getElementById("gs-name")?.focus();
      return;
    }
    setDownloading(true);
    try {
      const input = buildGradesheetInput({
        name: draft.name,
        email: student?.email ?? null,
        campus: student?.campus ?? null,
        programLabel: program.label,
        models,
        cgpa,
        bands,
      });
      const { downloadGradesheet } = await import("@/lib/gradesheet");
      await downloadGradesheet(input);
      toast.success("Gradesheet downloaded");
    } catch (err) {
      console.error("[calculator] gradesheet download failed", err);
      toast.error("The gradesheet couldn't be created. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/scgpa/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesters: models.map((m) => ({
            semester: m.number,
            subjects: m.rows
              .filter((r) => r.result)
              .map((r) => ({
                slug: r.subject.slug,
                obtained: r.result!.obtained,
                fullMarks: r.result!.fullMarks,
                ...(r.result!.parts
                  ? { theory: r.result!.parts.theory, internal: r.result!.parts.internalRaw, practical: r.result!.parts.practical }
                  : {}),
                ...(r.credits !== null ? { credits: r.credits } : {}),
              })),
          })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.status === 401) {
        toast.error("Your session has ended. Log in again to save.");
        return;
      }
      if (!res.ok) {
        toast.error(body.message ?? "Couldn't save your marks. Try again.");
        return;
      }
      toast.success(body.message ?? "Marks saved");
    } catch {
      toast.error("Couldn't reach the server. Your marks are still kept on this device.");
    } finally {
      setSaving(false);
    }
  };

  if (!model) return null;

  const actions = {
    name: draft.name,
    onNameChange: setName,
    onDownload: handleDownload,
    downloading,
    canDownload: anyEntered,
    onSave: handleSave,
    saving,
    signedIn,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-12 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-primary">SCGPA calculator · {program.name}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Type your marks. We&apos;ll do the grading.</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
          Every semester already lists its subjects, credits and the Theory, Internal and Practical marks. Enter what you scored in
          each part; we apply the 20% internal rule and the 40% pass rule, then show your grade, SGPA and CGPA. Download it as an IOE
          Connect gradesheet.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <SemesterStrip models={models} active={active} onSelect={setActive} scale={scale} panelId={PANEL_ID} />

          <section
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`sem-tab-${active}`}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Semester {roman}</h2>
                <p className="text-xs text-muted-foreground">
                  {model.hasSubjects ? `${model.entered} of ${model.listed} subjects entered` : "No subjects listed yet"}
                </p>
              </div>
              {model.entered > 0 && (
                <Button variant="ghost" size="sm" onClick={() => clearSemester(active)}>
                  <Eraser aria-hidden /> Clear marks
                </Button>
              )}
            </div>

            {!model.hasSubjects ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                The subject list for this semester hasn&apos;t been added yet. Check back soon.
              </p>
            ) : (
              <>
                <div
                  aria-hidden
                  className={cn(
                    "hidden gap-x-3 border-b border-border bg-surface-sunken/60 px-5 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground md:grid",
                    ROW_COLS,
                  )}
                >
                  <span>Subject</span>
                  <span className="text-center">Credit</span>
                  <span className="text-center">Theory</span>
                  <span className="text-center">Internal</span>
                  <span className="text-center">Practical</span>
                  <span className="text-center">Grade</span>
                  <span className="text-center">Points</span>
                </div>
                <ul className="divide-y divide-border">
                  {model.rows
                    .filter((r) => !r.group)
                    .map((row, i) => (
                      <SubjectRow key={row.subject.slug} row={row} index={i} topGrade={topGrade} onChange={setEntry} />
                    ))}
                </ul>
                {semester && semester.electives.length > 0 && (
                  <div className="border-t border-border">
                    <p className="bg-surface-sunken/60 px-4 py-2 text-[0.6875rem] font-semibold text-muted-foreground sm:px-5">
                      Electives — pick the one you took in each group
                    </p>
                    <ul className="divide-y divide-border">
                      {semester.electives.map((g) => {
                        const row = model.rows.find((r) => r.group === g.label);
                        return (
                          <li key={g.label}>
                            <ElectivePicker
                              semester={active}
                              group={g}
                              value={draft.choices[choiceKey(active, g.label)] ?? ""}
                              onChoose={choose}
                            />
                            {row && (
                              <ul className="border-t border-dashed border-border">
                                <SubjectRow
                                  row={row}
                                  index={model.rows.filter((r) => !r.group).length + semester.electives.indexOf(g)}
                                  topGrade={topGrade}
                                  onChange={setEntry}
                                />
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {/* Total */}
                <div className="border-t border-border bg-surface-sunken/60 px-4 py-3.5 sm:px-5">
                  <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm font-semibold md:grid md:gap-x-3", ROW_COLS)}>
                    <span>Total</span>
                    <span className="text-center font-mono tabular-nums md:block">
                      <span className="mr-1 font-sans text-xs font-medium text-muted-foreground md:sr-only">Credits</span>
                      {+totalCredits.toFixed(1)}
                    </span>
                    <span className="text-center font-mono tabular-nums md:col-span-3">
                      <span className="mr-1 font-sans text-xs font-medium text-muted-foreground md:sr-only">Marks</span>
                      {+model.result.totalObtained.toFixed(2)} / {totalFull}
                    </span>
                    <span className="text-center font-mono tabular-nums">
                      <span className="mr-1 font-sans text-xs font-medium text-muted-foreground md:sr-only">SGPA</span>
                      {formatFixed(model.result.sgpa, 2)}
                    </span>
                    <span className="text-center font-mono tabular-nums">
                      <span className="mr-1 font-sans text-xs font-medium text-muted-foreground md:sr-only">Points</span>
                      {creditPoints.toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>

          <HowCalculated bands={bands} />
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--nav-offset)+0.5rem)]">
          <SummaryPanel active={model} models={models} cgpa={cgpa} scale={scale} decimals={decimals} actions={actions} />
        </aside>
      </div>

      {/* Compact bar on small screens, above the mobile tab bar. */}
      <div className="sticky bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 mt-4 md:bottom-4 lg:hidden">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/95 px-3 py-1.5 shadow-lg backdrop-blur sm:gap-4 sm:px-4 sm:py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight text-muted-foreground">SGPA · Sem {roman}</p>
            <p className="font-mono text-base font-semibold leading-tight tabular-nums sm:text-xl">{formatFixed(model.result.sgpa, decimals)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight text-muted-foreground">CGPA</p>
            <p className="font-mono text-base font-semibold leading-tight tabular-nums sm:text-xl">{formatFixed(cgpa.cgpa, decimals)}</p>
          </div>
          <Button className="ml-auto" size="sm" onClick={handleDownload} loading={downloading} disabled={!anyEntered} aria-label="Download gradesheet">
            {!downloading && <Download aria-hidden />}
            <span className="hidden min-[400px]:inline">Gradesheet</span>
          </Button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announced}
      </p>
    </div>
  );
}
