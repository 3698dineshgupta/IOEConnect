import type { GradesheetInput } from "./types";

const num = (v: number) => (Number.isFinite(v) ? v : 0);

export const fmtPercent = (v: number) => `${num(v).toFixed(1)}%`;
export const fmtGpa = (v: number | null) => (v === null || !Number.isFinite(v) ? "-" : v.toFixed(2));
export const fmtMarks = (v: number) => {
  const n = num(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
/** Grade points: 1 decimal, 2 when needed (3.65 stays 3.65, 4 -> 4.0). */
export const fmtPoints = (v: number) => {
  const s = num(v).toFixed(2);
  return s.endsWith("0") ? s.slice(0, -1) : s;
};

export function slugify(s: string): string {
  const slug = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "student";
}

function parse(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function isoDay(iso: string): string {
  const d = parse(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string): string {
  const d = parse(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtTimestamp(iso: string): string {
  const d = parse(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(iso)}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function validateInput(input: GradesheetInput): void {
  const sems = input?.semesters;
  if (!Array.isArray(sems) || sems.every((s) => !s || !Array.isArray(s.subjects) || s.subjects.length === 0)) {
    throw new Error("Enter marks for at least one subject.");
  }
}

export type GradeTone = "good" | "blue" | "amber" | "bad";
export function gradeColor(grade: string): string {
  const g = grade.trim().toUpperCase();
  if (g.startsWith("A")) return "#047857";
  if (g.startsWith("B")) return "#1D4ED8";
  if (g.startsWith("C")) return "#B45309";
  return "#B91C1C";
}
