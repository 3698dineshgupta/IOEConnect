"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  calcCgpa,
  calcSemester,
  evaluateSubject,
  fullMarksError,
  marksError,
  parseMarks,
  type GradeBand,
  type SemesterResult,
  type SubjectResult,
} from "@/lib/scgpa";
import { createDraftStore, draftFromSaved } from "./draft-store";
import { choiceKey, type CalcSemester, type CalcSubject, type CalculatorProps, type EntryDraft } from "./types";

export interface RowModel {
  subject: CalcSubject;
  /** Elective group label when this row is a chosen elective. */
  group: string | null;
  entry: EntryDraft;
  /** Effective full marks (curriculum value, else what the student typed). */
  fullMarks: number | null;
  obtained: number | null;
  fullError: string | null;
  marksError: string | null;
  result: SubjectResult | null;
}

export interface SemesterModel {
  number: number;
  rows: RowModel[];
  /** Elective groups with no choice yet. */
  openGroups: string[];
  result: SemesterResult;
  listed: number;
  entered: number;
  hasSubjects: boolean;
}

const EMPTY: EntryDraft = { obtained: "", fullMarks: "" };

function buildRow(subject: CalcSubject, group: string | null, entry: EntryDraft, bands: GradeBand[]): RowModel {
  const typedFull = subject.fullMarks == null ? parseMarks(entry.fullMarks) : null;
  const fullMarks = subject.fullMarks ?? typedFull;
  const obtained = parseMarks(entry.obtained);
  const fullError = subject.fullMarks == null ? fullMarksError(typedFull) : null;
  const mErr = obtained === null ? null : Number.isNaN(obtained) ? "Enter a number." : marksError(obtained, fullError ? null : fullMarks);
  const result = evaluateSubject({ slug: subject.slug, fullMarks, obtained, credits: subject.credits }, bands);
  return { subject, group, entry, fullMarks, obtained, fullError, marksError: mErr, result };
}

function buildSemester(sem: CalcSemester, entries: Record<string, EntryDraft>, choices: Record<string, string>, bands: GradeBand[]): SemesterModel {
  const rows: RowModel[] = sem.core.map((s) => buildRow(s, null, entries[s.slug] ?? EMPTY, bands));
  const openGroups: string[] = [];
  for (const g of sem.electives) {
    const chosen = g.options.find((o) => o.slug === choices[choiceKey(sem.number, g.label)]);
    if (chosen) rows.push(buildRow(chosen, g.label, entries[chosen.slug] ?? EMPTY, bands));
    else openGroups.push(g.label);
  }
  const result = calcSemester(
    rows.map((r) => ({ slug: r.subject.slug, fullMarks: r.fullMarks, obtained: r.obtained, credits: r.subject.credits })),
    bands,
  );
  return {
    number: sem.number,
    rows,
    openGroups,
    result,
    listed: rows.length + openGroups.length,
    entered: result.entries.length,
    hasSubjects: sem.core.length + sem.electives.length > 0,
  };
}

export function useCalculator(props: CalculatorProps) {
  const { semesters, bands, saved, student, program } = props;
  const [store] = useState(() =>
    createDraftStore(draftFromSaved(saved, semesters, student?.name ?? ""), `ioeconnect:scgpa:v1:${program.slug}`),
  );
  const draft = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const models = useMemo(
    () => semesters.map((s) => buildSemester(s, draft.entries, draft.choices, bands)),
    [semesters, draft.entries, draft.choices, bands],
  );
  const cgpa = useMemo(() => calcCgpa(models.map((m) => m.result)), [models]);

  const setEntry = useCallback(
    (slug: string, patch: Partial<EntryDraft>) =>
      store.set((s) => ({ ...s, entries: { ...s.entries, [slug]: { ...(s.entries[slug] ?? EMPTY), ...patch } } })),
    [store],
  );
  const choose = useCallback(
    (semester: number, group: string, slug: string) =>
      store.set((s) => {
        const choices = { ...s.choices };
        if (slug) choices[choiceKey(semester, group)] = slug;
        else delete choices[choiceKey(semester, group)];
        return { ...s, choices };
      }),
    [store],
  );
  const clearSemester = useCallback(
    (semester: number) =>
      store.set((s) => {
        const sem = semesters.find((x) => x.number === semester);
        if (!sem) return s;
        const entries = { ...s.entries };
        for (const c of sem.core) delete entries[c.slug];
        for (const g of sem.electives) for (const o of g.options) delete entries[o.slug];
        return { ...s, entries };
      }),
    [store, semesters],
  );
  const setName = useCallback((name: string) => store.set((s) => ({ ...s, name: name.slice(0, 120) })), [store]);

  return { draft, models, cgpa, setEntry, choose, clearSemester, setName };
}
