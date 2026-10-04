/**
 * Contract between the SCGPA calculator (producer) and the gradesheet PDF
 * generator (consumer). Plain serialisable data only.
 */
export interface GradesheetSubject {
  code: string | null;
  name: string;
  /** Elective group label ("Elective I") when the subject was picked from one. */
  electiveGroup?: string | null;
  fullMarks: number;
  obtained: number;
  percent: number; // 0-100, one decimal
  grade: string; // e.g. "A+"
  points: number; // grade point, e.g. 4.0
}

export interface GradesheetSemester {
  number: number; // 1-8
  subjects: GradesheetSubject[];
  totalFullMarks: number;
  totalObtained: number;
  percent: number;
  sgpa: number;
}

export interface GradesheetScaleRow {
  grade: string;
  points: number;
  minPercent: number;
}

export interface GradesheetInput {
  student: {
    name: string;
    email?: string | null;
    campus?: string | null;
    program: string; // "Computer Engineering (CSE)"
  };
  generatedAt: string; // ISO timestamp
  semesters: GradesheetSemester[]; // only semesters the student filled in, ascending
  cgpa: number | null;
  /** How subjects were weighted in SGPA/CGPA. */
  weightMode: "marks" | "credits";
  scale: GradesheetScaleRow[];
}
