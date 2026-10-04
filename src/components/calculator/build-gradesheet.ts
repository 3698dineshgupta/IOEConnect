import { round2, type CgpaResult, type GradeBand } from "@/lib/scgpa";
import type { GradesheetInput, GradesheetSemester } from "@/lib/gradesheet/types";
import type { SemesterModel } from "./use-calculator";

const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;

/** Build the PDF contract from the live calculator state (semesters with ≥ 1 entry only). */
export function buildGradesheetInput(args: {
  name: string;
  email: string | null;
  campus: string | null;
  programLabel: string;
  models: SemesterModel[];
  cgpa: CgpaResult;
  bands: GradeBand[];
}): GradesheetInput {
  const semesters: GradesheetSemester[] = args.models
    .filter((m) => m.result.sgpa !== null)
    .sort((a, b) => a.number - b.number)
    .map((m) => ({
      number: m.number,
      subjects: m.rows
        .filter((r) => r.result)
        .map((r) => ({
          code: r.subject.code,
          name: r.subject.name,
          electiveGroup: r.group,
          fullMarks: r.result!.fullMarks,
          obtained: r.result!.obtained,
          percent: round1(r.result!.percent),
          grade: r.result!.grade,
          points: r.result!.points,
        })),
      totalFullMarks: m.result.totalFullMarks,
      totalObtained: m.result.totalObtained,
      percent: round1(m.result.percent ?? 0),
      sgpa: round2(m.result.sgpa ?? 0),
    }));

  return {
    student: {
      name: args.name.trim(),
      email: args.email,
      campus: args.campus,
      program: args.programLabel,
    },
    generatedAt: new Date().toISOString(),
    semesters,
    cgpa: args.cgpa.cgpa === null ? null : round2(args.cgpa.cgpa),
    // Same rule as the CGPA: credits only when every filled semester is credit-weighted.
    weightMode: args.cgpa.weightMode,
    scale: args.bands.map((b) => ({ grade: b.grade, points: b.points, minPercent: b.min_percent })),
  };
}
