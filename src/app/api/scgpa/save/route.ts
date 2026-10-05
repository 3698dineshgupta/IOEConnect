import "server-only";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { calcSemester, evaluateSubject, normalizeBands, round2, type SubjectInput } from "@/lib/scgpa";
import { createServerClient } from "@/lib/supabase/server";
import { indexSubjects, loadCalculatorProgram } from "@/app/calculator/data";

const marks = z.number().finite().min(0).max(1000);

const SaveSchema = z.object({
  semesters: z
    .array(
      z.object({
        semester: z.number().int().min(1).max(8),
        subjects: z
          .array(
            z.object({
              slug: z.string().trim().min(1).max(200),
              obtained: marks,
              fullMarks: marks.min(1),
              theory: marks.optional(),
              internal: marks.optional(),
              practical: marks.optional(),
              credits: z.number().finite().min(0).max(12).optional(),
            }),
          )
          .max(40),
      }),
    )
    .min(1)
    .max(8),
});

/**
 * POST /api/scgpa/save — replace the signed-in user's saved marks for the sent semesters.
 *
 * The client's numbers are never trusted: each subject must belong to that semester in the
 * curriculum, the curriculum's full marks override the client's when known, obtained marks
 * are range-checked, and SGPA is recomputed here with the shared pure function.
 * Semesters sent with no subjects are cleared. RLS (scgpa_saves_own) scopes rows to the user.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Log in to save your marks." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request." }, { status: 400 });
  }
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Some marks are invalid. Check your entries and try again." }, { status: 400 });

  try {
    const [{ semesters }, scgpa] = await Promise.all([loadCalculatorProgram(), getSetting("scgpa")]);
    const bands = normalizeBands(scgpa.grades);
    const index = indexSubjects(semesters);

    const sentSemesters = new Set<number>();
    type Stored = { slug: string; obtained: number; fullMarks: number; theory?: number; internal?: number; practical?: number; credits?: number };
    const rows: { user_id: string; semester: number; subjects: Stored[]; sgpa: number; total_credits: number }[] = [];

    for (const sem of parsed.data.semesters) {
      if (sentSemesters.has(sem.semester)) continue;
      sentSemesters.add(sem.semester);

      const seen = new Set<string>();
      const inputs: SubjectInput[] = [];
      const stored: Stored[] = [];
      for (const s of sem.subjects) {
        const known = index.get(s.slug);
        if (!known || known.semester !== sem.semester || seen.has(s.slug)) continue;
        seen.add(s.slug);
        const credits = s.credits && s.credits > 0 ? s.credits : known.subject.credits;
        const max = known.subject.max;
        if (max) {
          // Component-graded subject: recompute from the parts with the same rules as the page (20% cap, 40% pass).
          const parts = { max, theory: s.theory ?? null, internal: s.internal ?? null, practical: s.practical ?? null };
          const input: SubjectInput = { slug: s.slug, fullMarks: known.subject.fullMarks, obtained: null, credits, parts };
          const evaluated = evaluateSubject(input, bands);
          if (!evaluated) {
            return Response.json({ message: `Check the marks for ${known.subject.name}.` }, { status: 400 });
          }
          inputs.push(input);
          stored.push({ slug: s.slug, obtained: round2(evaluated.obtained), fullMarks: evaluated.fullMarks, theory: s.theory, internal: s.internal, practical: s.practical, ...(credits ? { credits } : {}) });
          continue;
        }
        const fullMarks = known.subject.fullMarks ?? s.fullMarks; // curriculum wins when known
        if (s.obtained > fullMarks) {
          return Response.json({ message: `Marks for ${known.subject.name} can't exceed ${fullMarks}.` }, { status: 400 });
        }
        inputs.push({ slug: s.slug, obtained: s.obtained, fullMarks, credits });
        stored.push({ slug: s.slug, obtained: s.obtained, fullMarks, ...(credits ? { credits } : {}) });
      }

      const result = calcSemester(inputs, bands);
      if (result.sgpa === null) continue; // nothing to store; the old row (if any) is still cleared below
      rows.push({
        user_id: user.id,
        semester: sem.semester,
        subjects: stored,
        sgpa: Math.min(4, Math.max(0, round2(result.sgpa))),
        total_credits: Math.round(result.totalWeight * 10) / 10,
      });
    }

    const supabase = await createServerClient();
    const { error: delError } = await supabase
      .from("scgpa_saves")
      .delete()
      .eq("user_id", user.id)
      .in("semester", [...sentSemesters]);
    if (delError) {
      console.error("[scgpa/save] delete failed", delError);
      return Response.json({ message: "Couldn't save your marks. Try again." }, { status: 500 });
    }

    if (rows.length) {
      const { error: insError } = await supabase.from("scgpa_saves").insert(rows);
      if (insError) {
        console.error("[scgpa/save] insert failed", insError);
        return Response.json({ message: "Couldn't save your marks. Try again." }, { status: 500 });
      }
    }

    return Response.json(
      {
        message: rows.length
          ? `Saved ${rows.length} semester${rows.length === 1 ? "" : "s"}`
          : "Saved — no marks entered, so your saved marks were cleared",
        saved: rows.map((r) => ({ semester: r.semester, sgpa: r.sgpa })),
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[scgpa/save] failed", err);
    return Response.json({ message: "Couldn't save your marks. Try again." }, { status: 500 });
  }
}
