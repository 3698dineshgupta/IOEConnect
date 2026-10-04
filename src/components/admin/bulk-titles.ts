/**
 * Pure helpers for the admin bulk uploader: resource titles, the existing-resource index and the
 * per-row check / note logic. No React imports so they can be tested on their own.
 */
import type { BulkSubject } from "./bulk-matching";
import { KINDS, type ExistingResource, type ResourceKind, type Row } from "./bulk-types";

const TITLE_MAX = 200; // server limit
const CLEAN_MAX = 120;
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i;

/**
 * File name -> readable title: no extension, no "Downloaded from <site>" tail, no "(1)" copy marker,
 * "_" and "-" become spaces, spaces collapsed, title-cased only when the name is all lowercase, at most 120 chars.
 */
export function cleanTitle(fileName: string): string {
  let t = fileName
    .replace(/\.pdf$/i, "")
    .replace(/\s*[([]?\s*downloaded\s+from\s+.*$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s*\(\d{1,2}\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t && t === t.toLowerCase()) t = t.replace(/[a-z0-9]+/g, (w) => (ROMAN.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
  if (t.length > CLEAN_MAX) {
    const cut = t.slice(0, CLEAN_MAX);
    const sp = cut.lastIndexOf(" ");
    t = (sp > CLEAN_MAX * 0.6 ? cut.slice(0, sp) : cut).trim();
  }
  return t;
}

/** Lowercase words joined by single spaces: used to compare titles. */
export function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Title of a file in "several files per subject" mode: the cleaned file name, prefixed with the subject name when it is not already in it. */
export function notesTitle(fileName: string, subjectName: string): string {
  const clean = cleanTitle(fileName) || subjectName;
  const has = ` ${normTitle(clean)} `.includes(` ${normTitle(subjectName)} `);
  return (has ? clean : `${subjectName}: ${clean}`).slice(0, TITLE_MAX);
}

/** "<title> — Part i of n" (unchanged when n = 1). */
export function partTitle(title: string, i: number, n: number): string {
  if (n <= 1) return title;
  const suffix = ` — Part ${i} of ${n}`;
  return title.slice(0, TITLE_MAX - suffix.length).trimEnd() + suffix;
}

/** "notes.pdf" -> "notes (part 2 of 5).pdf" */
export function partFileName(name: string, i: number, n: number): string {
  const stem = name.replace(/\.pdf$/i, "");
  return `${stem} (part ${i} of ${n}).pdf`;
}

const PART_RE = /^(.*) part (\d+) of (\d+)$/;

export interface ExistingIndex {
  /** subject id -> newest resource id */
  bySubject: Map<string, string>;
  /** `${subjectId}|${normTitle}` -> resource id (newest wins) */
  byTitle: Map<string, string>;
  /** `${subjectId}|${normTitle of the base}|${part}` -> resource id, for "<title> — Part i of n" resources */
  byPart: Map<string, string>;
  /** subject id -> number of resources */
  count: Map<string, number>;
}

export function buildExistingIndex(list: ExistingResource[]): ExistingIndex {
  const idx: ExistingIndex = { bySubject: new Map(), byTitle: new Map(), byPart: new Map(), count: new Map() };
  for (const r of list) {
    const t = normTitle(r.title);
    idx.bySubject.set(r.subjectId, r.id);
    idx.byTitle.set(`${r.subjectId}|${t}`, r.id);
    idx.count.set(r.subjectId, (idx.count.get(r.subjectId) ?? 0) + 1);
    const m = t.match(PART_RE);
    if (m) {
      // A title that was uploaded in parts counts as "already uploaded" (part 1 preferred).
      const base = `${r.subjectId}|${m[1]}`;
      idx.byPart.set(`${base}|${m[2]}`, r.id);
      if (m[2] === "1" || !idx.byTitle.has(base)) idx.byTitle.set(base, r.id);
    }
  }
  return idx;
}

/** The existing resource a row targets: by subject, or by subject + title in "several per subject" mode. */
export function findExisting(idx: ExistingIndex, subjectId: string, title: string, multi: boolean): string | null {
  return (multi ? idx.byTitle.get(`${subjectId}|${normTitle(title)}`) : idx.bySubject.get(subjectId)) ?? null;
}

/** Replace mode for part `i` of a split file: the existing "<title> — Part i of …" resource, else (part 1) the row's existing resource. */
export function partReplaceId(idx: ExistingIndex, subjectId: string, title: string, i: number, rowExisting: string | null): string | null {
  return idx.byPart.get(`${subjectId}|${normTitle(title)}|${i}`) ?? (i === 1 ? rowExisting : null);
}

export interface EvalContext {
  kind: ResourceKind;
  multi: boolean;
  replace: boolean;
  index: ExistingIndex;
  subjectById: Map<string, BulkSubject>;
  /** Targets already taken by an earlier checked row: subject ids, or subject|title keys in multi mode. Mutated. */
  claimed: Set<string>;
}

export const claimKey = (r: Pick<Row, "subjectId" | "title">, multi: boolean) => (multi ? `${r.subjectId}|${normTitle(r.title)}` : r.subjectId);

/**
 * Work out the title, checkbox and note of an idle row. In single mode two files never target the same
 * subject; in "several per subject" mode two files never get the same title for one subject.
 */
export function evaluate(r: Row, ctx: EvalContext, keepChecked: boolean): Row {
  const subject = r.subjectId ? ctx.subjectById.get(r.subjectId) : undefined;
  if (!subject) return { ...r, subjectId: "", checked: false, title: "", existingId: null, note: r.excluded ? r.matchNote : r.subjectId ? "Skipped" : r.note };
  const k = KINDS[ctx.kind];
  const title = ctx.multi ? notesTitle(r.file.name, subject.name) : `${subject.name} ${k.title}`;
  const existingId = findExisting(ctx.index, subject.id, title, ctx.multi);
  let checked = keepChecked ? r.checked : true;
  let note = r.manual ? "Chosen manually" : r.matchNote;
  if (existingId) {
    checked = ctx.replace;
    if (ctx.multi) note = ctx.replace ? "Will replace the file with this title" : "Already uploaded";
    else note = ctx.replace ? `Will replace the existing ${k.noun}` : `Already has ${k.has}`;
  }
  const key = claimKey({ subjectId: subject.id, title }, ctx.multi);
  if (checked && ctx.claimed.has(key)) {
    checked = false;
    note = ctx.multi ? "Another file has the same title" : "Another file already matches this subject";
  }
  if (checked) ctx.claimed.add(key);
  return { ...r, title, existingId, checked, note };
}
