import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { EmptyState, buttonVariants } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getProgramTree, getSemester } from "@/lib/curriculum";
import { programCode, programPlainName, trimTo } from "@/lib/seo";
import { getResourcesBySubject } from "@/components/resources/data";
import { ResourceFilters, parseFilterAccess, parseFilterType } from "@/components/resources/filters";
import { parseSlugNumber, semesterHref, shellUser, summarizeResources, toRoman, yearSlug } from "@/components/resources/format";
import { Breadcrumbs, BrowseContainer, PageHero, PrevNext, first, plural } from "@/components/resources/page-parts";
import { SubjectGrid } from "@/components/resources/subject-card";

type Props = {
  params: Promise<{ program: string; year: string; semester: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(p: { program: string; year: string; semester: string }) {
  const y = parseSlugNumber(p.year, "year");
  const s = parseSlugNumber(p.semester, "semester");
  if (!y || !s) return null;
  return getSemester(p.program, y, s);
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const ctx = await load(await params);
  if (!ctx) return { title: "Semester not found", robots: { index: false } };
  const sem = toRoman(ctx.semester.number);
  const plain = programPlainName(ctx.program.name);
  return {
    title: `IOE ${programCode(ctx.program)} Semester ${sem} Notes & PYQs`,
    description: trimTo(
      `IOE ${plain} semester ${sem} subjects: ${ctx.subjects
        .slice(0, 5)
        .map((s) => s.name)
        .join(", ")}. Notes, past questions and syllabus.`,
      155,
    ),
    alternates: { canonical: `/resources/${ctx.program.slug}/${yearSlug(ctx.year.number)}/semester-${ctx.semester.number}` },
  };
}

export default async function SemesterPage({ params, searchParams }: Props) {
  const p = await params;
  const sp = await searchParams;
  const [ctx, profile] = await Promise.all([load(p), getProfile()]);
  if (!ctx) notFound();

  const type = parseFilterType(first(sp.type));
  const access = parseFilterAccess(first(sp.access));

  const [bySubject, tree] = await Promise.all([getResourcesBySubject(ctx.subjects.map((s) => s.id)), getProgramTree(ctx.program.slug)]);
  const totals = summarizeResources([...bySubject.values()].flat());

  const matches = (t: string) => (type === "OTHER" ? !["NOTES", "PYQ", "SYLLABUS"].includes(t) : t === type);
  let subjects = ctx.subjects;
  if (type || access) {
    for (const [id, list] of bySubject) {
      bySubject.set(
        id,
        list.filter((r) => (!type || matches(r.resource_type)) && (!access || r.access_type === access)),
      );
    }
    subjects = subjects.filter((s) => (bySubject.get(s.id) ?? []).length > 0);
  }

  // Neighbouring semesters across the whole program.
  const flat = (tree?.years ?? []).flatMap((y) => y.semesters.map((s) => ({ year: y.number, sem: s.number })));
  const at = flat.findIndex((x) => x.sem === ctx.semester.number);
  const prev = at > 0 ? flat[at - 1] : undefined;
  const next = at >= 0 ? flat[at + 1] : undefined;

  const base = semesterHref(ctx.program.slug, ctx.year.number, ctx.semester.number);
  const sem = toRoman(ctx.semester.number);

  return (
    <PublicShell user={shellUser(profile)}>
      <BrowseContainer>
        <Breadcrumbs
          items={[
            { label: "Resources", href: "/resources" },
            { label: ctx.program.name, href: `/resources/${ctx.program.slug}` },
            { label: `Year ${toRoman(ctx.year.number)}`, href: `/resources/${ctx.program.slug}/${yearSlug(ctx.year.number)}` },
            { label: `Semester ${sem}` },
          ]}
        />
        <PageHero
          eyebrow={`${ctx.program.short_name || ctx.program.name} · Year ${toRoman(ctx.year.number)}`}
          title={`Semester ${sem}`}
          description={`${plural(ctx.subjects.length, "subject")} this semester. Open notes, past questions or the syllabus straight from each card.`}
          stats={[
            { label: "Subjects", value: ctx.subjects.length },
            { label: "Notes", value: totals.notesDocs.length },
            { label: "PYQ collections", value: totals.pyqDocs.length },
            { label: "Syllabus PDFs", value: totals.syllabusDocs.length },
          ].filter((s) => s.value > 0)}
        />

        <ResourceFilters action={base} values={{ type, access }} fields={["type", "access"]} className="mb-12" />

        {ctx.subjects.length === 0 ? (
          <EmptyState title="No subjects yet" description="Subjects for this semester have not been added." />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={<SearchX aria-hidden />}
            title="No resources match these filters"
            description="Clear a filter, or ask us to add what you need."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href={base} className={buttonVariants({ variant: "outline" })}>
                  Clear filters
                </Link>
                <Link href="/my-requests" className={buttonVariants()}>
                  Request a resource
                </Link>
              </div>
            }
          />
        ) : (
          <section aria-label={`Semester ${sem} subjects`}>
            <SubjectGrid subjects={subjects} resourcesBySubject={bySubject} semesterNumber={ctx.semester.number} />
          </section>
        )}

        <PrevNext
          label="Other semesters"
          prev={prev ? { href: semesterHref(ctx.program.slug, prev.year, prev.sem), label: `Semester ${toRoman(prev.sem)}` } : null}
          next={next ? { href: semesterHref(ctx.program.slug, next.year, next.sem), label: `Semester ${toRoman(next.sem)}` } : null}
        />
      </BrowseContainer>
    </PublicShell>
  );
}
