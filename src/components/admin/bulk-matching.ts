/**
 * Pure file-name -> subject matching for the admin bulk uploader. No React imports so it can be
 * compiled and tested on its own.
 *
 * Matching always runs against ONE program's subject list, so a file can never match a subject of
 * another program. The alias tables are keyed by CSE slugs: an alias only counts when its slug is
 * in the current list; otherwise matching falls back to the subject names (and course codes).
 */
import { CORE_ALIASES, ELECTIVE_ALIASES, GENERIC_ALIASES, PYQ_ALIASES } from "./syllabus-aliases";

export interface BulkSubject {
  id: string;
  slug: string;
  name: string;
  /** Course code such as "CE 451"; null when unknown. Used as a tie-breaker. */
  code: string | null;
  semesterNumber: number;
  programSlug: string;
}

export interface MatchResult {
  subject: BulkSubject | null;
  note: string;
  /** The file sits in a folder starting with "_" and must stay unmatched. */
  excluded?: boolean;
}

const STOPWORDS = new Set(["and", "of", "the"]);
/** Words that describe the kind of document, not the subject. Singularized forms (see `singular`). */
const NOISE = new Set(["ques", "que", "question", "pyq", "old", "past", "paper", "exam", "syllabus", "note", "notes", "qs", "bank", "collection", "set"]);
const singular = (t: string) => (t.length > 3 && t.endsWith("s") && !/(ss|is|us)$/.test(t) ? t.slice(0, -1) : t);

/** AppliedMechanicsOldQues -> Applied Mechanics Old Ques; BEEQues -> BEE Ques; Math1 -> Math 1. */
function splitCamel(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z]{2,})/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2");
}

/** Lowercase words (camelCase and digits split), no "and/of/the", no noise words, singularized. Used for file stems, alias keys and subject names. */
export function words(s: string): string[] {
  return splitCamel(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(singular)
    .filter((t) => !NOISE.has(t));
}

const CODE = /^[a-z]{2,3}\d{3,4}[a-z]{0,3}$/i;
const DIGITS = /^\d+$/;

/** File name -> normalized word list: no extension, no leading number / E1-01 prefix, no course codes, no noise words. */
export function normalizeStem(fileName: string): string[] {
  const stem = fileName
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .replace(/^\s*(?:e\d\s*-\s*\d+|\d+)[\s.\-]*/i, "")
    .replace(/[()[\]]/g, " ");
  const kept: string[] = [];
  let prevCode = false;
  for (const t of stem.split(/[\s\-.]+/)) {
    if (!t) continue;
    if (CODE.test(t)) {
      prevCode = true;
      continue;
    }
    // Trailing section numbers ("CT765_02", "2079") are dropped; a lone digit like "Math 1" is part of the name.
    if (DIGITS.test(t) && (t.length >= 2 || prevCode)) continue;
    prevCode = false;
    kept.push(t);
  }
  return words(kept.join(" "));
}

/** "CE 451", "ce451", "EG 604 SH" -> "CE451" / "EG604". Null when it does not look like a course code. */
export function codeKey(code: string | null | undefined): string | null {
  const m = (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").match(/^([A-Z]{2,3})(\d{3})/);
  return m ? m[0] : null;
}

/** Course codes written in a file name: "11_Applied_Mechanics_CE451.pdf" -> ["CE451"]. */
export function fileCodes(fileName: string): string[] {
  const stem = fileName.replace(/\.pdf$/i, "");
  const out = new Set<string>();
  for (const m of stem.matchAll(/(?:^|[^a-z])([a-z]{2,3})[\s_-]?(\d{3})(?!\d)/gi)) out.add(`${m[1]}${m[2]}`.toUpperCase());
  return [...out];
}

function containsPhrase(hay: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true;
  return false;
}

const isElectiveFile = (name: string) => /^\s*e\d\s*[-_ ]/i.test(name);

/** Longest matching alias phrase whose slug exists in `subjects` wins; on a tie the earlier table wins. */
function bestAlias(tokens: string[], tables: Record<string, string>[], subjects: BulkSubject[]): BulkSubject | null {
  let best: { len: number; subject: BulkSubject } | null = null;
  for (const aliases of tables) {
    for (const [key, slug] of Object.entries(aliases)) {
      const k = words(key);
      if (!containsPhrase(tokens, k) || (best && k.length <= best.len)) continue;
      const subject = subjects.find((s) => s.slug === slug);
      if (subject) best = { len: k.length, subject };
    }
  }
  return best?.subject ?? null;
}

/** Word forms of a subject name: as written, and without a parenthesized qualifier ("Applied Mechanics (Statics)" -> "Applied Mechanics"). */
function nameForms(name: string): string[][] {
  const full = words(name);
  const base = words(name.replace(/\([^)]*\)/g, " "));
  return base.length && base.join(" ") !== full.join(" ") ? [full, base] : [full];
}

/** Among equally good candidates, prefer the one whose course code appears in the file name. */
function tieBreak(cands: BulkSubject[], codes: string[]): BulkSubject[] {
  if (cands.length < 2 || !codes.length) return cands;
  const byCode = cands.filter((s) => {
    const k = codeKey(s.code);
    return !!k && codes.includes(k);
  });
  return byCode.length ? byCode : cands;
}

/**
 * Match one name (a file name, or a folder name when `strict`) to a subject of ONE program.
 * Order: elective aliases (E1-/E2-/E3- files), aliases, equal / contained name, then (not strict)
 * a looser all-words-present overlap that must point at exactly one subject.
 */
export function matchFile(name: string, subjects: BulkSubject[], opts: { strict?: boolean } = {}): MatchResult {
  const tokens = normalizeStem(name);
  const codes = fileCodes(name);

  if (isElectiveFile(name)) {
    const hit = bestAlias(tokens, [ELECTIVE_ALIASES], subjects);
    return hit ? { subject: hit, note: "Matched elective" } : { subject: null, note: "No matching subject" };
  }
  const alias = bestAlias(tokens, [PYQ_ALIASES, CORE_ALIASES, GENERIC_ALIASES], subjects);
  if (alias) return { subject: alias, note: "Matched" };

  // Equal or contained name: the longest subject name wins, the course code breaks ties.
  let bestLen = 0;
  let cands: BulkSubject[] = [];
  for (const s of subjects) {
    let len = 0;
    const fullLen = words(s.name).length;
    for (const n of nameForms(s.name)) {
      const equal = n.length === tokens.length && n.every((w, i) => w === tokens[i]);
      const contained = (tokens.length >= 2 && containsPhrase(n, tokens)) || (n.length >= 2 && containsPhrase(tokens, n));
      // A match on the FULL name (qualifier included) beats one on the name without its bracketed
      // part: "Applied-Mechanics-Dynamics" must pick "Applied Mechanics (Dynamics)", not "(Statics)".
      // An exactly equal name beats any containment: "Control-System" must not pick "Digital Control System".
      if (equal || contained) len = Math.max(len, fullLen + (n.length === fullLen ? 100 : 0) + (equal ? 1000 : 0));
    }
    if (!len) continue;
    if (len > bestLen) {
      bestLen = len;
      cands = [s];
    } else if (len === bestLen) cands.push(s);
  }
  if (cands.length) return { subject: tieBreak(cands, codes)[0], note: "Matched by name" };
  if (opts.strict) return { subject: null, note: "No matching subject" };

  // Loose: every file word appears in the subject name (or every name word in the file name).
  const tokenSet = new Set(tokens);
  if (!tokens.some((t) => t.length >= 4)) return { subject: null, note: "No matching subject" };
  const loose = subjects.filter((s) =>
    nameForms(s.name).some((n) => {
      const nSet = new Set(n);
      return tokens.every((t) => nSet.has(t)) || (n.length >= 2 && n.every((w) => tokenSet.has(w)));
    }),
  );
  const picked = tieBreak(loose, codes);
  if (picked.length === 1) return { subject: picked[0], note: "Matched by name" };
  return { subject: null, note: picked.length > 1 ? "Several subjects match; choose one" : "No matching subject" };
}

/** Immediate parent folder of a relative path ("notes/c-programming/a.pdf" -> "c-programming"); null when there is none. */
export function folderOf(relPath: string): string | null {
  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

/**
 * Match a picked file. When it came from a folder, the immediate parent folder name is the subject
 * hint (exact slug, then alias / name) and wins over the file name. Folders starting with "_" stay unmatched.
 */
export function matchPicked(fileName: string, relPath: string, subjects: BulkSubject[]): MatchResult {
  const folder = folderOf(relPath);
  if (folder?.startsWith("_")) return { subject: null, note: `Left out (folder ${folder})`, excluded: true };
  if (folder) {
    const slug = folder.trim().toLowerCase();
    const bySlug = subjects.find((s) => s.slug === slug);
    if (bySlug) return { subject: bySlug, note: "Matched by folder" };
    const hit = matchFile(folder, subjects, { strict: true }).subject;
    if (hit) return { subject: hit, note: "Matched by folder" };
  }
  return matchFile(fileName, subjects);
}
