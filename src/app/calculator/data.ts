import "server-only";

import { getProgramTree, getPrograms } from "@/lib/curriculum";
import type { ProgramTree, Subject } from "@/lib/types";
import type { CalcElectiveGroup, CalcSemester, CalcSubject, SavedSubject } from "@/components/calculator/types";

export const CALCULATOR_PROGRAM_SLUG = "cse";
const SEMESTER_COUNT = 8;

export interface CalculatorProgram {
  program: { slug: string; name: string; label: string };
  semesters: CalcSemester[];
}

const toCalcSubject = (s: Subject): CalcSubject => ({
  slug: s.slug,
  code: s.code,
  name: s.name,
  fullMarks: typeof s.full_marks === "number" && s.full_marks > 0 ? s.full_marks : null,
  ltp: s.ltp?.trim() || null,
  credits: typeof s.credits === "number" && s.credits > 0 ? Number(s.credits) : null,
});

function toSemesters(tree: ProgramTree | null): CalcSemester[] {
  const bySem = new Map<number, Subject[]>();
  for (const y of tree?.years ?? []) for (const s of y.semesters) bySem.set(s.number, [...(bySem.get(s.number) ?? []), ...s.subjects]);

  return Array.from({ length: SEMESTER_COUNT }, (_, i) => {
    const number = i + 1;
    const subjects = bySem.get(number) ?? [];
    const core = subjects.filter((s) => !s.is_elective && !s.elective_group).map(toCalcSubject);
    const groups = new Map<string, CalcElectiveGroup>();
    for (const s of subjects) {
      if (!s.is_elective && !s.elective_group) continue;
      const label = s.elective_group?.trim() || "Elective";
      const g = groups.get(label) ?? { label, options: [] };
      g.options.push(toCalcSubject(s));
      groups.set(label, g);
    }
    // Subjects arrive sorted by sort_order, so Map insertion order keeps Elective I/II/III in order.
    return { number, core, electives: [...groups.values()] };
  });
}

/** CSE program tree (fallback: first active program) as plain calculator data. */
export async function loadCalculatorProgram(): Promise<CalculatorProgram> {
  let tree = await getProgramTree(CALCULATOR_PROGRAM_SLUG);
  if (!tree) {
    const first = (await getPrograms())[0];
    if (first) tree = await getProgramTree(first.slug);
  }
  const name = tree?.name ?? "Computer Engineering";
  const short = tree?.short_name?.trim() || tree?.slug?.toUpperCase() || "CSE";
  return {
    // The seeded name already reads "Computer Engineering (CSE)"; don't append the code twice.
    program: {
      slug: tree?.slug ?? CALCULATOR_PROGRAM_SLUG,
      name,
      label: name.toLowerCase().includes(`(${short.toLowerCase()})`) ? name : `${name} (${short})`,
    },
    semesters: toSemesters(tree),
  };
}

/** Lookup used by the save API: slug -> semester + curriculum facts. */
export function indexSubjects(semesters: CalcSemester[]): Map<string, { semester: number; subject: CalcSubject }> {
  const map = new Map<string, { semester: number; subject: CalcSubject }>();
  for (const sem of semesters) {
    for (const s of sem.core) map.set(s.slug, { semester: sem.number, subject: s });
    for (const g of sem.electives) for (const s of g.options) map.set(s.slug, { semester: sem.number, subject: s });
  }
  return map;
}

/** Parse a stored scgpa_saves.subjects value ([{slug, obtained, fullMarks}]); legacy rows yield []. */
export function parseSavedSubjects(raw: unknown): SavedSubject[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedSubject[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.slug !== "string" || typeof r.obtained !== "number" || typeof r.fullMarks !== "number") continue;
    if (!Number.isFinite(r.obtained) || !Number.isFinite(r.fullMarks)) continue;
    out.push({ slug: r.slug, obtained: r.obtained, fullMarks: r.fullMarks });
  }
  return out;
}
