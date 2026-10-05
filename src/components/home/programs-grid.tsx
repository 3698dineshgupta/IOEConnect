import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { programCode, programPlainName } from "@/lib/seo";

/**
 * Plain, crawlable links to every program (and its semesters). Built from the live curriculum, so a
 * new program appears here automatically and no page is reachable only through JavaScript.
 */
export async function ProgramsGrid() {
  const programs = await getPrograms();
  const trees = (await Promise.all(programs.map((p) => getProgramTree(p.slug)))).filter((t): t is NonNullable<typeof t> => !!t);
  if (!trees.length) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trees.map((t) => {
        const semesters = t.years.flatMap((y) => y.semesters.map((s) => ({ y: y.number, n: s.number, subjects: s.subjects.length })));
        const subjects = semesters.reduce((a, s) => a + s.subjects, 0);
        return (
          <li key={t.slug} className="card-lift flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-primary">{programCode(t)}</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.015em]">
              <Link href={`/resources/${t.slug}`} className="hover:text-primary">
                IOE {programPlainName(t.name)} notes
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {subjects} subjects across {semesters.length} semesters: syllabus, notes and past questions.
            </p>
            <nav aria-label={`${programPlainName(t.name)} semesters`} className="mt-4 flex flex-wrap gap-1.5">
              {semesters.map((s) => (
                <Link
                  key={s.n}
                  href={`/resources/${t.slug}/year-${s.y}/semester-${s.n}`}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-muted/50 px-2.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
                  aria-label={`Sem ${s.n}: ${programPlainName(t.name)} semester ${s.n} notes`}
                >
                  Sem {s.n}
                </Link>
              ))}
            </nav>
            <Link href={`/resources/${t.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Browse {programCode(t)} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
