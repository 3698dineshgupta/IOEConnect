import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { getShellUser } from "@/components/community/shell-user";
import Calculator from "@/components/calculator/Calculator";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/utils";
import { getProfile, getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { normalizeBands } from "@/lib/scgpa";
import { createServerClient } from "@/lib/supabase/server";
import { loadCalculatorProgram, parseSavedSubjects } from "./data";
import type { SavedSemester } from "@/components/calculator/types";

export const metadata: Metadata = {
  title: "IOE SGPA & CGPA Calculator",
  description:
    "Free IOE SGPA and CGPA calculator: enter Theory, Internal and Practical marks; the 20% internal rule and 40% pass mark are applied. Unofficial.",
  alternates: { canonical: "/calculator" },
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "IOE SGPA & CGPA Calculator",
          url: siteUrl("/calculator"),
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any (web browser)",
          inLanguage: "en",
          description: "Calculates IOE SGPA and CGPA from Theory, Internal and Practical marks using the 2080/81 grading scale.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" },
          publisher: { "@id": siteUrl("/#organization") },
        }}
      />
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
