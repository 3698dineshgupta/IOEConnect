/**
 * SCGPA calculation — pure, dependency-free, safe on client and server.
 *
 * Model
 * -----
 * - Each subject has full marks (from the curriculum, or typed by the student when the
 *   curriculum does not know it) and the student's obtained marks.
 * - percent = obtained / fullMarks * 100 (full precision).
 * - Grade: the highest band whose `min_percent` <= percent. Below every band -> the failing
 *   grade (the zero-point band, or "F") with 0 points.
 * - Subject weight:
 *     * `credits` mode — subject.credits, used only when EVERY entered subject of the
 *       semester has credits > 0;
 *     * otherwise `marks` mode — the subject's full marks.
 *   SGPA = Σ(points × weight) / Σ weight.
 * - CGPA: Σ(SGPA × semesterWeight) / Σ semesterWeight over semesters with ≥ 1 entry.
 *   semesterWeight = the semester's total credits when EVERY such semester is in `credits`
 *   mode, otherwise the semester's total full marks (so units never mix).
 * - Numbers keep full precision internally; round only for display (`round2`).
 */

export interface GradeBand {
  grade: string;
  points: number;
  /** Lowest percentage (inclusive) that earns this grade. */
  min_percent: number;
}

/** A stored grade row; old rows may lack `min_percent`. */
export interface GradeBandInput {
  grade: string;
  points: number;
  min_percent?: number | null;
}

/**
 * DEFAULT bands — UNVERIFIED. These are placeholders, not confirmed against the official
 * TU/IOE grading rules. Admins must confirm/edit them in Admin → Settings → SCGPA.
 */
export const DEFAULT_GRADE_BANDS: readonly GradeBand[] = [
  { grade: "A+", points: 4.0, min_percent: 90 },
  { grade: "A", points: 3.7, min_percent: 80 },
  { grade: "B+", points: 3.3, min_percent: 70 },
  { grade: "B", points: 3.0, min_percent: 60 },
  { grade: "C+", points: 2.7, min_percent: 50 },
  { grade: "C", points: 2.3, min_percent: 45 },
  { grade: "D", points: 2.0, min_percent: 40 },
  { grade: "F", points: 0.0, min_percent: 0 },
];

export type WeightMode = "marks" | "credits";

export interface SubjectInput {
  slug: string;
  /** Full marks; null/0 = unknown (subject is not counted). */
  fullMarks: number | null;
  /** Obtained marks; null = not entered (subject is not counted). */
  obtained: number | null;
  credits?: number | null;
}

export interface SubjectResult {
  slug: string;
  fullMarks: number;
  obtained: number;
  percent: number;
  grade: string;
  points: number;
  credits: number | null;
  passed: boolean;
}

export interface SemesterResult {
  entries: SubjectResult[];
  weightMode: WeightMode;
  /** Σ weight in the semester's own mode (credits or full marks). */
  totalWeight: number;
  totalFullMarks: number;
  totalObtained: number;
  /** Σ credits of entered subjects, or null when any entered subject lacks credits. */
  totalCredits: number | null;
  /** null when nothing is entered. */
  sgpa: number | null;
  /** null when nothing is entered. */
  percent: number | null;
}

export interface CgpaResult {
  cgpa: number | null;
  weightMode: WeightMode;
  semestersCounted: number;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatFixed(n: number | null | undefined, decimals = 2): string {
  return isNum(n) ? n.toFixed(decimals) : "—";
}

/**
 * Fill missing `min_percent` from the default band with the same grade, drop rows that
 * still have none, de-duplicate thresholds and sort high → low.
 */
export function normalizeBands(rows: readonly GradeBandInput[] | null | undefined): GradeBand[] {
  const out: GradeBand[] = [];
  const seen = new Set<number>();
  for (const r of rows ?? []) {
    if (!r || typeof r.grade !== "string" || !isNum(r.points)) continue;
    const grade = r.grade.trim();
    if (!grade) continue;
    const fallback = DEFAULT_GRADE_BANDS.find((d) => d.grade.toUpperCase() === grade.toUpperCase());
    const min = isNum(r.min_percent) ? r.min_percent : fallback?.min_percent;
    if (!isNum(min) || min < 0 || min > 100 || seen.has(min)) continue;
    seen.add(min);
    out.push({ grade, points: r.points, min_percent: min });
  }
  out.sort((a, b) => b.min_percent - a.min_percent);
  return out.length ? out : DEFAULT_GRADE_BANDS.map((b) => ({ ...b }));
}

/** The failing grade: the lowest zero-point band, else "F". */
export function failingGrade(bands: readonly GradeBand[]): GradeBand {
  const zero = [...bands].filter((b) => b.points === 0).sort((a, b) => a.min_percent - b.min_percent)[0];
  return zero ?? { grade: "F", points: 0, min_percent: 0 };
}

/** Grade for a percentage. `bands` should come from `normalizeBands`. */
export function gradeFor(percent: number, bands: readonly GradeBand[]): { grade: string; points: number; passed: boolean } {
  const sorted = [...bands].sort((a, b) => b.min_percent - a.min_percent);
  // Tiny epsilon so 36/90*100 (=40.000…01 or 39.999…9 in floating point) lands on the 40 band.
  const band = sorted.find((b) => percent + 1e-9 >= b.min_percent && b.points > 0);
  if (band) return { grade: band.grade, points: band.points, passed: true };
  const fail = failingGrade(sorted);
  return { grade: fail.grade, points: 0, passed: false };
}

/** Inline validation message for a marks entry, or null when valid / empty. */
export function marksError(obtained: number | null, fullMarks: number | null): string | null {
  if (obtained === null) return null;
  if (!isNum(obtained)) return "Enter a number.";
  if (obtained < 0) return "Marks can't be negative.";
  if (!isNum(fullMarks) || fullMarks <= 0) return "Enter the full marks first.";
  if (obtained > fullMarks) return `Max is ${fullMarks}.`;
  return null;
}

export function fullMarksError(fullMarks: number | null): string | null {
  if (fullMarks === null) return null;
  if (!isNum(fullMarks) || fullMarks <= 0) return "Full marks must be above 0.";
  if (fullMarks > 1000) return "Full marks can't exceed 1000.";
  return null;
}

/** Evaluate one subject, or null when it does not count (empty / invalid). */
export function evaluateSubject(s: SubjectInput, bands: readonly GradeBand[]): SubjectResult | null {
  const { fullMarks, obtained } = s;
  if (!isNum(fullMarks) || !isNum(obtained)) return null;
  if (fullMarksError(fullMarks) || marksError(obtained, fullMarks)) return null;
  const percent = (obtained / fullMarks) * 100;
  const g = gradeFor(percent, bands);
  return {
    slug: s.slug,
    fullMarks,
    obtained,
    percent,
    grade: g.grade,
    points: g.points,
    credits: isNum(s.credits) && s.credits > 0 ? s.credits : null,
    passed: g.passed,
  };
}

export function calcSemester(subjects: readonly SubjectInput[], bands: readonly GradeBand[]): SemesterResult {
  const entries = subjects.map((s) => evaluateSubject(s, bands)).filter((r): r is SubjectResult => r !== null);
  const allCredits = entries.length > 0 && entries.every((e) => e.credits !== null);
  const weightMode: WeightMode = allCredits ? "credits" : "marks";
  const weightOf = (e: SubjectResult) => (allCredits ? (e.credits as number) : e.fullMarks);

  let totalWeight = 0;
  let weighted = 0;
  let totalFullMarks = 0;
  let totalObtained = 0;
  for (const e of entries) {
    const w = weightOf(e);
    totalWeight += w;
    weighted += e.points * w;
    totalFullMarks += e.fullMarks;
    totalObtained += e.obtained;
  }
  return {
    entries,
    weightMode,
    totalWeight,
    totalFullMarks,
    totalObtained,
    totalCredits: allCredits ? totalWeight : null,
    sgpa: totalWeight > 0 ? weighted / totalWeight : null,
    percent: totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : null,
  };
}

export function calcCgpa(semesters: readonly SemesterResult[]): CgpaResult {
  const counted = semesters.filter((s) => s.sgpa !== null && s.totalWeight > 0);
  if (!counted.length) return { cgpa: null, weightMode: "marks", semestersCounted: 0 };
  const allCredits = counted.every((s) => s.weightMode === "credits" && s.totalCredits !== null);
  let sum = 0;
  let weight = 0;
  for (const s of counted) {
    const w = allCredits ? (s.totalCredits as number) : s.totalFullMarks;
    sum += (s.sgpa as number) * w;
    weight += w;
  }
  return {
    cgpa: weight > 0 ? sum / weight : null,
    weightMode: allCredits ? "credits" : "marks",
    semestersCounted: counted.length,
  };
}

/** Parse a user-typed number; "" -> null, garbage -> NaN (so validation can flag it). */
export function parseMarks(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  return Number(t);
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
