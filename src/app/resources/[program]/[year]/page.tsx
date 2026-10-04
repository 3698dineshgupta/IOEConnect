import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { EmptyState } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getProgramTree } from "@/lib/curriculum";
import { getResourcesBySubject } from "@/components/resources/data";
import { parseSlugNumber, semesterHref, shellUser, summarizeResources, toRoman, yearSlug } from "@/components/resources/format";
import { Breadcrumbs, BrowseContainer, PageHero, PrevNext, SectionHeading, plural } from "@/components/resources/page-parts";
import { SubjectGrid } from "@/components/resources/subject-card";

type Props = { params: Promise<{ program: string; year: string }> };

async function load(program: string, yearParam: string) {
  const n = parseSlugNumber(yearParam, "year");
  const tree = n ? await getProgramTree(program) : null;
  const year = tree?.years.find((y) => y.number === n);
  return tree && year ? { tree, year } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { program, year } = await params;
  const data = await load(program, year);
  if (!data) return { title: "Year not found", robots: { index: false } };
  return {
    title: `${data.tree.name} Year ${toRoman(data.year.number)} Notes & PYQs`,
    description: `${data.tree.name} year ${toRoman(data.year.number)} notes, past questions and syllabus by semester.`,
    alternates: { canonical: `/resources/${data.tree.slug}/year-${data.year.number}` },
  };
}

export default async function YearPage({ params }: Props) {
  const { program, year: yearParam } = await params;
  const [data, profile] = await Promise.all([load(program, yearParam), getProfile()]);
  if (!data) notFound();
  const { tree, year } = data;

  const subjects = year.semesters.flatMap((s) => s.subjects);
  const bySubject = await getResourcesBySubject(subjects.map((s) => s.id));
  const all = summarizeResources([...bySubject.values()].flat());
  const idx = tree.years.findIndex((y) => y.number === year.number);
  const prev = tree.years[idx - 1];
  const next = tree.years[idx + 1];

  return (
    <PublicShell user={shellUser(profile)}>
      <BrowseContainer>
        <Breadcrumbs
          items={[
            { label: "Resources", href: "/resources" },
            { label: tree.name, href: `/resources/${tree.slug}` },
            { label: `Year ${toRoman(year.number)}` },
          ]}
        />
        <PageHero
          eyebrow={`${tree.short_name || tree.name} · Year ${String(year.number).padStart(2, "0")}`}
          title={`Year ${toRoman(year.number)}`}
          description={`${plural(year.semesters.length, "semester")} and ${plural(subjects.length, "subject")} of ${tree.name}. Open any subject for its notes, past questions and syllabus.`}
          stats={[
            { label: "Subjects", value: subjects.length },
            { label: "Notes", value: all.notesDocs.length },
            { label: "PYQ collections", value: all.pyqDocs.length },
            { label: "Syllabus PDFs", value: all.syllabusDocs.length },
          ].filter((s) => s.value > 0)}
        />

        {year.semesters.length === 0 ? (
          <EmptyState title="No semesters yet" description="Semesters for this year have not been added." />
        ) : (
          <div className="space-y-20">
            {year.semesters.map((s) => (
              <section key={s.id} aria-labelledby={`sem-${s.number}-h`}>
                <SectionHeading
                  id={`sem-${s.number}-h`}
                  title={`Semester ${toRoman(s.number)}`}
                  meta={plural(s.subjects.length, "subject")}
                  action={
                    <Link
                      href={semesterHref(tree.slug, year.number, s.number)}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-xs transition-[border-color,color,box-shadow] duration-200 hover:border-primary/40 hover:text-primary hover:shadow-md"
                    >
                      Open semester <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  }
                />
                {s.subjects.length === 0 ? (
                  <EmptyState title="No subjects yet" description="Subjects for this semester have not been added." className="py-10" />
                ) : (
                  <SubjectGrid subjects={s.subjects} resourcesBySubject={bySubject} semesterNumber={s.number} />
                )}
              </section>
            ))}
          </div>
        )}

        <PrevNext
          label="Other years"
          prev={prev ? { href: `/resources/${tree.slug}/${yearSlug(prev.number)}`, label: `Year ${toRoman(prev.number)}` } : null}
          next={next ? { href: `/resources/${tree.slug}/${yearSlug(next.number)}`, label: `Year ${toRoman(next.number)}` } : null}
        />
      </BrowseContainer>
    </PublicShell>
  );
}
