import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { getShellUser } from "@/components/community/shell-user";
import Calculator from "@/components/calculator/Calculator";
import { getProfile, getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { normalizeBands } from "@/lib/scgpa";
import { createServerClient } from "@/lib/supabase/server";
import { loadCalculatorProgram, parseSavedSubjects } from "./data";
import type { SavedSemester } from "@/components/calculator/types";

export const metadata: Metadata = {
  title: "SCGPA Calculator | IOE Connect",
  description:
    "Enter your marks for each IOE semester to see grades, SGPA and CGPA, then download an IOE Connect gradesheet. Unofficial calculator.",
};
export const dynamic = "force-dynamic";

async function loadSaved(userId: string): Promise<SavedSemester[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("scgpa_saves")
      .select("semester, subjects, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(64);
    if (error) throw error;
    const seen = new Set<number>();
    const out: SavedSemester[] = [];
    for (const row of (data ?? []) as { semester: number | null; subjects: unknown }[]) {
      if (!row.semester || seen.has(row.semester)) continue; // newest row per semester wins
      seen.add(row.semester);
      const subjects = parseSavedSubjects(row.subjects);
      if (subjects.length) out.push({ semester: row.semester, subjects });
    }
    return out;
  } catch (err) {
    console.error("[calculator] loading saved marks failed", err);
    return [];
  }
}

export default async function CalculatorPage() {
  const [user, shellUser, profile, scgpa, program] = await Promise.all([
    getSessionUser(),
    getShellUser(),
    getProfile(),
    getSetting("scgpa"),
    loadCalculatorProgram(),
  ]);
  const saved = user ? await loadSaved(user.id) : [];

  return (
    <PublicShell user={shellUser}>
      <Calculator
        program={program.program}
        semesters={program.semesters}
        bands={normalizeBands(scgpa.grades)}
        decimals={Math.min(4, Math.max(0, scgpa.decimals ?? 2))}
        signedIn={!!user}
        student={
          profile
            ? { name: profile.full_name?.trim() ?? "", email: profile.email ?? null, campus: profile.college ?? null }
            : null
        }
        saved={saved}
      />
    </PublicShell>
  );
}
