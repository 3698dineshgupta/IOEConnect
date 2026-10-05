import type { ComponentMax, GradeBand } from "@/lib/scgpa";

/** Plain, serialisable props passed from the server page to the calculator. */
export interface CalcSubject {
  slug: string;
  code: string | null;
  name: string;
  /** From the curriculum; null = unknown, the student types it. */
  fullMarks: number | null;
  ltp: string | null;
  /** Theory / internal / practical maxima (derived from L-T-P + total); null when full marks are unknown. */
  max: ComponentMax | null;
  /** Curriculum credits, or derived from lecture hours; the student can correct it. */
  credits: number | null;
}

export interface CalcElectiveGroup {
  /** "Elective I" etc. */
  label: string;
  options: CalcSubject[];
}

export interface CalcSemester {
  number: number; // 1..8
  core: CalcSubject[];
  electives: CalcElectiveGroup[];
}

export interface SavedSubject {
  slug: string;
  /** Final marks after the 20% rule. */
  obtained: number;
  fullMarks: number;
  /** Component marks as entered (absent on old saves). */
  theory?: number;
  internal?: number;
  practical?: number;
  credits?: number;
}

export interface SavedSemester {
  semester: number;
  subjects: SavedSubject[];
}

export interface CalculatorProps {
  program: { slug: string; name: string; label: string };
  semesters: CalcSemester[];
  bands: GradeBand[];
  decimals: number;
  signedIn: boolean;
  student: { name: string; email: string | null; campus: string | null } | null;
  saved: SavedSemester[];
}

/** What the student typed for one subject (raw strings keep partial input like "4."). */
export interface EntryDraft {
  theory: string;
  internal: string;
  practical: string;
  /** Student's correction of the credits; empty = use the subject's own. */
  credits: string;
  /** Only used when the subject has no component split (full marks unknown). */
  obtained: string;
  /** Only used when the curriculum has no full marks for the subject. */
  fullMarks: string;
}

export type EntryMap = Record<string, EntryDraft>;
/** key = `${semester}:${groupLabel}` -> chosen subject slug */
export type ChoiceMap = Record<string, string>;

export const choiceKey = (semester: number, group: string) => `${semester}:${group}`;
