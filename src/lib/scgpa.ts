/**
 * SCGPA calculation — pure, dependency-free, safe on client and server.
 *
 * Model (IOE grading, 2080/81)
 * ----------------------------
 * - A subject is graded from up to three components: Theory (final board exam), Internal
 *   (college assessment) and Practical.
 * - 20% RULE: the Internal mark is capped by the Theory result:
 *     ceiling% = min(100, theory% + 20);  internal = min(entered, ceiling% / 100 × full internal).
 *   Subjects without a theory component are not capped.
 * - PASS RULE: each component needs at least 40% of its own full marks (internal is checked
 *   after the cap). Failing any component gives an overall F (0 points).
 * - total = theory + capped internal + practical; percent = total / full marks × 100.
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

/** Official IOE grading scale (2080/81), supplied by the site owner. Editable in Admin → Settings → SCGPA. */
export const DEFAULT_GRADE_BANDS: readonly GradeBand[] = [
  { grade: "A", points: 4.0, min_percent: 80 },
  { grade: "A-", points: 3.7, min_percent: 75 },
  { grade: "B+", points: 3.3, min_percent: 70 },
  { grade: "B", points: 3.0, min_percent: 65 },
  { grade: "B-", points: 2.7, min_percent: 60 },
  { grade: "C+", points: 2.3, min_percent: 55 },
  { grade: "C", points: 2.0, min_percent: 50 },
  { grade: "D", points: 1.0, min_percent: 40 },
  { grade: "F", points: 0.0, min_percent: 0 },
];

/** Minimum share of each component's full marks needed to pass it. */
export const COMPONENT_PASS_PERCENT = 40;
/** Internal marks can be at most this many percentage points above the theory percentage. */
export const INTERNAL_CAP_BONUS = 20;

export interface ComponentMax {
  theory: number;
  internal: number;
  practical: number;
}
export type ComponentKey = keyof ComponentMax;
export const COMPONENT_KEYS: readonly ComponentKey[] = ["theory", "internal", "practical"];
export const COMPONENT_LABELS: Record<ComponentKey, string> = { theory: "Theory", internal: "Internal", practical: "Practical" };

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Split a subject's total marks into Theory / Internal / Practical maxima from its L-T-P and total.
 *   - no practical hours:   60% theory + 40% internal            (100 → 60/40, 50 → 30/20)
 *   - lecture + practical:  total 100 → 30/20/50; above 100 → 60/40/(total − 100)
 *   - practical only:       40% internal + 60% practical          (50 → 20/30)
 * Matches the official examples (Maths 60/40, Programming 60/40/50, Drawing 30/20/50, Physics 60/40/25).
 */
export function splitMarks(fullMarks: number, ltp: string | null | undefined): ComponentMax {
  const [l = 0, , p = 0] = (ltp ?? "").split("-").map((x) => Number(x));
  const lecture = Number.isFinite(l) ? l : 0;
  const practical = Number.isFinite(p) ? p : 0;
  if (practical <= 0) return { theory: r2(fullMarks * 0.6), internal: r2(fullMarks * 0.4), practical: 0 };
  if (lecture <= 0) return { theory: 0, internal: r2(fullMarks * 0.4), practical: r2(fullMarks * 0.6) };
  if (fullMarks > 100) return { theory: 60, internal: 40, practical: r2(fullMarks - 100) };
  if (fullMarks === 100) return { theory: 30, internal: 20, practical: 50 };
  return { theory: r2(fullMarks * 0.3), internal: r2(fullMarks * 0.2), practical: r2(fullMarks * 0.5) };
}

/**
 * Credits when the curriculum has none: 1 credit per 15 lecture hours, plus 1 for a short lecture
 * subject with practical work (e.g. Drawing 1-0-3 → 2); practical-only work is 1 credit per 30 hours.
 */
export function deriveCredits(lectureHours: number | null | undefined, ltp: string | null | undefined): number | null {
  const h = typeof lectureHours === "number" && lectureHours > 0 ? lectureHours : null;
  if (h === null) return null;
  const [l = 0, , p = 0] = (ltp ?? "").split("-").map((x) => Number(x));
  if (l > 0) return h / 15 + (p > 0 && l < 3 ? 1 : 0);
  return Math.max(1, Math.round((h / 30) * 2) / 2);
}

export interface PartsInput {
  max: ComponentMax;
  theory: number | null;
  internal: number | null;
  practical: number | null;
}

export interface PartsResult {
  theory: number;
  /** Internal as entered. */
  internalRaw: number;
  /** Internal after the 20% rule. */
  internal: number;
  practical: number;
  capped: boolean;
  /** Components below 40% (internal judged after the cap). */
  failed: ComponentKey[];
}

/** Apply the 20% rule. Returns the internal mark that counts. */
export function capInternal(theory: number, theoryMax: number, internal: number, internalMax: number): { internal: number; capped: boolean } {
  if (theoryMax <= 0 || internalMax <= 0) return { internal, capped: false };
  const ceilingPct = Math.min(100, (theory / theoryMax) * 100 + INTERNAL_CAP_BONUS);
  const ceiling = (ceilingPct / 100) * internalMax;
  return internal > ceiling + 1e-9 ? { internal: ceiling, capped: true } : { internal, capped: false };
}

/** Per-component validation messages (empty object = fine). */
export function partsErrors(p: PartsInput): Partial<Record<ComponentKey, string>> {
  const out: Partial<Record<ComponentKey, string>> = {};
  for (const k of COMPONENT_KEYS) {
    const v = p[k];
    if (v === null || p.max[k] <= 0) continue;
    if (!isNum(v)) out[k] = "Enter a number.";
    else if (v < 0) out[k] = "Can't be negative.";
    else if (v > p.max[k]) out[k] = `Max is ${p.max[k]}.`;
  }
  return out;
}

/** Evaluate the components; null until every component the subject has is entered and valid. */
export function evaluateParts(p: PartsInput): PartsResult | null {
  if (Object.keys(partsErrors(p)).length) return null;
  const need = COMPONENT_KEYS.filter((k) => p.max[k] > 0);
  if (!need.length || need.some((k) => !isNum(p[k]))) return null;
  const theory = p.max.theory > 0 ? (p.theory as number) : 0;
  const internalRaw = p.max.internal > 0 ? (p.internal as number) : 0;
  const practical = p.max.practical > 0 ? (p.practical as number) : 0;
  const { internal, capped } = capInternal(theory, p.max.theory, internalRaw, p.max.internal);
  const failed: ComponentKey[] = [];
  const below = (v: number, max: number) => max > 0 && v + 1e-9 < (max * COMPONENT_PASS_PERCENT) / 100;
  if (below(theory, p.max.theory)) failed.push("theory");
  if (below(internal, p.max.internal)) failed.push("internal");
  if (below(practical, p.max.practical)) failed.push("practical");
  return { theory, internalRaw, internal, practical, capped, failed };
}

export type WeightMode = "marks" | "credits";

export interface SubjectInput {
  slug: string;
  /** Full marks; null/0 = unknown (subject is not counted). */
  fullMarks: number | null;
  /** Obtained marks; null = not entered (subject is not counted). */
  obtained: number | null;
  credits?: number | null;
  /** Component marks (theory / internal / practical). When set it replaces `fullMarks`/`obtained`. */
  parts?: PartsInput | null;
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
  /** Present when graded from components. */
  parts?: PartsResult;
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
  if (s.parts) {
    const parts = evaluateParts(s.parts);
    if (!parts) return null;
    const fullMarks = s.parts.max.theory + s.parts.max.internal + s.parts.max.practical;
    const obtained = parts.theory + parts.internal + parts.practical;
    const percent = (obtained / fullMarks) * 100;
    const fail = failingGrade(bands);
    const g = parts.failed.length ? { grade: fail.grade, points: 0, passed: false } : gradeFor(percent, bands);
    return {
      slug: s.slug,
      fullMarks,
      obtained,
      percent,
      grade: g.grade,
      points: g.points,
      credits: isNum(s.credits) && s.credits > 0 ? s.credits : null,
      passed: g.passed,
      parts,
    };
  }
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
