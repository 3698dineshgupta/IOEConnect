import type { Profile, PublicResourceView } from "@/lib/types";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

/** "2018–2025", a single year, or "" when none. */
export function yearRange(years: number[] | null | undefined): string {
  const list = (years ?? []).filter((y) => Number.isFinite(y));
  if (list.length === 0) return "";
  const min = Math.min(...list);
  const max = Math.max(...list);
  return min === max ? String(min) : `${min}–${max}`;
}

export const yearSlug = (n: number) => `year-${n}`;
export const semesterSlug = (n: number) => `semester-${n}`;

/** Accepts "year-1" or "1". */
export function parseSlugNumber(value: string, prefix: "year" | "semester"): number | null {
  // "\\d" (escaped): inside a template literal a bare "\d" collapses to "d" and never matches digits.
  let slug: string;
  try {
    slug = decodeURIComponent(value).toLowerCase();
  } catch {
    return null;
  }
  const m = new RegExp(`^(?:${prefix}-)?(\\d{1,2})$`).exec(slug);
  return m ? Number(m[1]) : null;
}

export function semesterHref(program: string, year: number, semester: number) {
  return `/resources/${program}/${yearSlug(year)}/${semesterSlug(semester)}`;
}

/**
 * Big PDFs are split into parts on upload and titled "<name> — Part i of n". Those parts are one
 * document to a student, so lists group them and show them together.
 */
const PART_RE = /^(.*?)\s*[—–-]\s*Part\s+(\d+)\s+of\s+(\d+)\s*$/i;

export function splitPartTitle(title: string): { base: string; part: number; of: number } | null {
  const m = PART_RE.exec(title.trim());
  if (!m || !m[1].trim()) return null;
  const part = Number(m[2]);
  const of = Number(m[3]);
  return part >= 1 && of >= 2 && part <= of ? { base: m[1].trim(), part, of } : null;
}

/** One document: a single resource, or all the parts of a split one (sorted by part number). */
export interface DocBundle {
  key: string;
  title: string;
  parts: PublicResourceView[];
  pages: number | null;
  premium: boolean;
}

export function bundleParts(resources: PublicResourceView[]): DocBundle[] {
  const out: DocBundle[] = [];
  const byKey = new Map<string, { bundle: DocBundle; nums: Map<string, number> }>();
  for (const r of resources) {
    const p = splitPartTitle(r.title);
    const key = p ? `${r.subject_slug}|${r.resource_type}|${p.base.toLowerCase()}` : r.id;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { bundle: { key, title: p ? p.base : r.title, parts: [], pages: null, premium: false }, nums: new Map() };
      byKey.set(key, entry);
      out.push(entry.bundle);
    }
    entry.bundle.parts.push(r);
    entry.nums.set(r.id, p?.part ?? 1);
  }
  for (const { bundle, nums } of byKey.values()) {
    bundle.parts.sort((a, b) => (nums.get(a.id) ?? 1) - (nums.get(b.id) ?? 1));
    const pages = bundle.parts.reduce((n, x) => n + (x.page_count ?? 0), 0);
    bundle.pages = pages > 0 ? pages : null;
    bundle.premium = bundle.parts.some((x) => x.access_type === "PREMIUM");
  }
  return out;
}

export interface SubjectResourceSummary {
  /** Documents (split parts grouped) — use these for counts and lists shown to students. */
  notesDocs: DocBundle[];
  pyqDocs: DocBundle[];
  syllabusDocs: DocBundle[];
  otherDocs: DocBundle[];
  notes: PublicResourceView[];
  pyq: PublicResourceView[];
  syllabus: PublicResourceView[];
  other: PublicResourceView[];
  years: number[];
  hasPremium: boolean;
  pageCount: number | null;
  updatedAt: string | null;
}

export function summarizeResources(resources: PublicResourceView[]): SubjectResourceSummary {
  const notes = resources.filter((r) => r.resource_type === "NOTES");
  const pyq = resources.filter((r) => r.resource_type === "PYQ");
  const syllabus = resources.filter((r) => r.resource_type === "SYLLABUS");
  const other = resources.filter((r) => !["NOTES", "PYQ", "SYLLABUS"].includes(r.resource_type));
  const years = Array.from(new Set(pyq.flatMap((r) => r.available_years ?? []))).sort((a, b) => a - b);
  const pages = resources.reduce((sum, r) => sum + (r.page_count ?? 0), 0);
  const updated = resources.map((r) => r.updated_at).sort().at(-1) ?? null;
  return {
    notesDocs: bundleParts(notes),
    pyqDocs: bundleParts(pyq),
    syllabusDocs: bundleParts(syllabus),
    otherDocs: bundleParts(other),
    notes,
    pyq,
    syllabus,
    other,
    years,
    hasPremium: resources.some((r) => r.access_type === "PREMIUM"),
    pageCount: pages > 0 ? pages : null,
    updatedAt: updated,
  };
}

export function shellUser(profile: Profile | null) {
  return profile
    ? { name: profile.full_name, email: profile.email, avatar: profile.avatar, role: profile.role }
    : null;
}
