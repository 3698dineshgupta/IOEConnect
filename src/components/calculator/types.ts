import type { GradeBand } from "@/lib/scgpa";

/** Plain, serialisable props passed from the server page to the calculator. */
export interface CalcSubject {
  slug: string;
  code: string | null;
  name: string;
  /** From the curriculum; null = unknown, the student types it. */
  fullMarks: number | null;
  ltp: string | null;
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
  obtained: number;
  fullMarks: number;
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
  obtained: string;
  /** Only used when the curriculum has no full marks for the subject. */
  fullMarks: string;
}

export type EntryMap = Record<string, EntryDraft>;
/** key = `${semester}:${groupLabel}` -> chosen subject slug */
export type ChoiceMap = Record<string, string>;

export const choiceKey = (semester: number, group: string) => `${semester}:${group}`;
