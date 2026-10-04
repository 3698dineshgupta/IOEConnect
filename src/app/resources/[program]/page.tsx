import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, SearchX } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, buttonVariants } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getProgramTree } from "@/lib/curriculum";
import { createServerClient } from "@/lib/supabase/server";
import type { PublicResourceView } from "@/lib/types";
import { getResourcesBySubject } from "@/components/resources/data";
import { ResourceFilters, parseFilterAccess, parseFilterType } from "@/components/resources/filters";
import { semesterHref, shellUser, toRoman, yearSlug } from "@/components/resources/format";
import {
  Breadcrumbs,
  BrowseContainer,
  PageHero,
  Pagination,
  ResourceCard,
  SectionHeading,
  first,
  parsePage,
  plural,
} from "@/components/resources/page-parts";
import { ProgramTimeline } from "@/components/resources/program-timeline";
import { semesterSectionId, yearSectionId } from "@/components/resources/section-ids";
import { SubjectGrid } from "@/components/resources/subject-card";

type Props = {
  params: Promise<{ program: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { program } = await params;
  const tree = await getProgramTree(program);
  if (!tree) return { title: "Program not found", robots: { index: false } };
  return {
    title: `${tree.name} Notes & PYQs by Year and Semester`,
    description: `All ${tree.name} notes, past year questions and syllabus for IOE, organised by year and semester.`,
    alternates: { canonical: `/resources/${tree.slug}` },
  };
}

export default async function ProgramPage({ params, searchParams }: Props) {
  const { program } = await params;
  const sp = await searchParams;
  const [tree, profile] = await Promise.all([getProgramTree(program), getProfile()]);
  if (!tree) notFound();

  const year = first(sp.year);
  const semester = first(sp.semester);
  const type = parseFilterType(first(sp.type));
  const access = parseFilterAccess(first(sp.access));
  const page = parsePage(sp.page);

  const allSemesters = [...new Set(tree.years.flatMap((y) => y.semesters.map((s) => s.number)))].sort((a, b) => a - b);
  const visibleYears = tree.years
    .filter((y) => !year || String(y.number) === year)
    .map((y) => ({ ...y, semesters: y.semesters.filter((s) => !semester || String(s.number) === semester) }))
    .filter((y) => y.semesters.length > 0);
  const visibleSubjectIds = visibleYears.flatMap((y) => y.semesters.flatMap((s) => s.subjects.map((x) => x.id)));

  const totalSemesters = tree.years.reduce((n, y) => n + y.semesters.length, 0);
  const totalSubjects = tree.years.reduce((n, y) => n + y.semesters.reduce((m, s) => m + s.subjects.length, 0), 0);

  // Flat, paginated resource list when a type/access filter is active.
  let rows: PublicResourceView[] = [];
  let total = 0;
  const filtering = !!(type || access);
  let bySubject = new Map<string, PublicResourceView[]>();
  if (filtering) {
    if (visibleSubjectIds.length > 0) {
      const supabase = await createServerClient();
      let query = supabase.from("public_resources").select("*", { count: "exact" }).in("subject_id", visibleSubjectIds);
      if (type === "OTHER") query = query.not("resource_type", "in", "(NOTES,PYQ,SYLLABUS)");
      else if (type) query = query.eq("resource_type", type);
      if (access) query = query.eq("access_type", access);
      const from = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await query.order("updated_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) console.error("[resources] filtered list failed", error);
      rows = (data ?? []) as PublicResourceView[];
      total = count ?? 0;
    }
  } else {
    bySubject = await getResourcesBySubject(visibleSubjectIds);
  }
  const published = [...bySubject.values()].reduce((n, l) => n + l.length, 0);

  const timeline = visibleYears.map((y) => ({
    number: y.number,
    subjectCount: y.semesters.reduce((n, s) => n + s.subjects.length, 0),
    semesters: y.semesters.map((s) => ({ number: s.number, subjectCount: s.subjects.length })),
  }));

  return (
    <PublicShell user={shellUser(profile)}>
      <BrowseContainer>
        <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: tree.name }]} />
        <PageHero
          eyebrow={tree.short_name ? `${tree.short_name} · Program` : "Program"}
          title={tree.name}
          description={tree.description || "Every year and semester of the program, with notes, past questions and the official syllabus for each subject."}
          stats={[
            { label: "Years", value: tree.years.length },
            { label: "Semesters", value: totalSemesters },
            { label: "Subjects", value: totalSubjects },
            ...(!filtering && !year && !semester && published > 0 ? [{ label: "Published files", value: published }] : []),
          ].filter((s) => s.value > 0)}
        />

        {!filtering && timeline.length > 0 && (
          <Reveal y={20} className="mb-10">
            <ProgramTimeline years={timeline} />
          </Reveal>
        )}

        <ResourceFilters
          action={`/resources/${tree.slug}`}
          values={{ year, semester, type, access }}
          fields={["year", "semester", "type", "access"]}
          yearOptions={tree.years.map((y) => y.number)}
          semesterOptions={allSemesters}
          className="mb-12"
        />

        {filtering ? (
          rows.length === 0 ? (
            <EmptyState
              icon={<SearchX aria-hidden />}
              title="No matching resources"
              description="Nothing published for these filters yet. Clear a filter, or ask us for what you need."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={`/resources/${tree.slug}`} className={buttonVariants({ variant: "outline" })}>
                    Clear filters
                  </Link>
                  <Link href="/my-requests" className={buttonVariants()}>
                    Request a resource
                  </Link>
                </div>
              }
            />
          ) : (
            <section aria-labelledby="filtered-h">
              <SectionHeading id="filtered-h" title="Matching resources" meta={plural(total, "resource")} />
              <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={0.04}>
                {rows.map((r) => (
                  <StaggerItem as="li" key={r.id} className="h-full">
                    <ResourceCard resource={r} />
                  </StaggerItem>
                ))}
              </Stagger>
              <Pagination basePath={`/resources/${tree.slug}`} params={{ year, semester, type, access }} page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
            </section>
          )
        ) : visibleYears.length === 0 ? (
          <EmptyState title="No years added yet" description="The curriculum for this program is being set up." />
        ) : (
          <div className="space-y-20 sm:space-y-24">
            {visibleYears.map((y) => (
              <section key={y.id} id={yearSectionId(y.number)} aria-labelledby={`${yearSectionId(y.number)}-h`}>
                <div className="relative mb-10 flex flex-wrap items-end justify-between gap-4 pb-5">
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-primary/50 via-border-strong to-transparent" />
                  <div>
                    <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary">Year {String(y.number).padStart(2, "0")}</p>
                    <h2
                      id={`${yearSectionId(y.number)}-h`}
                      data-section-heading=""
                      tabIndex={-1}
                      className="mt-2 text-3xl font-extrabold tracking-[-0.04em] outline-none sm:text-4xl"
                    >
                      Year {toRoman(y.number)}
                    </h2>
                  </div>
                  <Link
                    href={`/resources/${tree.slug}/${yearSlug(y.number)}`}
                    className="link-underline inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Year overview →
                  </Link>
                </div>
                <div className="space-y-16">
                  {y.semesters.map((s) => (
                    <section key={s.id} id={semesterSectionId(s.number)} aria-labelledby={`${semesterSectionId(s.number)}-h`}>
                      <SectionHeading
                        id={`${semesterSectionId(s.number)}-h`}
                        as="h3"
                        title={`Semester ${toRoman(s.number)}`}
                        meta={plural(s.subjects.length, "subject")}
                        action={
                          <Link
                            href={semesterHref(tree.slug, y.number, s.number)}
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
              </section>
            ))}
          </div>
        )}
      </BrowseContainer>
    </PublicShell>
  );
}
