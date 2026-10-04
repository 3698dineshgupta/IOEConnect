import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, SearchX } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { EmptyState, buttonVariants } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { cn } from "@/lib/utils";
import {
  BROWSE_TYPES,
  countPublishedByType,
  listResourcesByType,
  parseBrowseType,
  searchCatalogLabeled,
  type BrowseType,
  type SearchHit,
} from "@/components/resources/data";
import { shellUser } from "@/components/resources/format";
import { ProgramCard, type ProgramCardData } from "@/components/resources/program-card";
import {
  BrowseContainer,
  PageHero,
  Pagination,
  ResourceCard,
  SectionHeading,
  TYPE_STYLE,
  TypeTile,
  first,
  parsePage,
  plural,
} from "@/components/resources/page-parts";
import { ResourceSearch } from "@/components/search/resource-search";

const PAGE_SIZE = 24;

const TYPE_COPY: Record<BrowseType, { eyebrow: string; title: string; description: string; noun: [string, string] }> = {
  PYQ: {
    eyebrow: "Past year questions",
    title: "PYQs",
    description: "Past exam papers for every subject we have, newest uploads first. Each collection opens in the view-only reader.",
    noun: ["PYQ collection", "PYQ collections"],
  },
  NOTES: {
    eyebrow: "Notes",
    title: "Notes",
    description: "Subject notes shared for IOE students, newest uploads first.",
    noun: ["set of notes", "sets of notes"],
  },
  SYLLABUS: {
    eyebrow: "Syllabus",
    title: "Syllabus",
    description: "Official syllabus PDFs per subject. Chapters, hours and marks are inside each document.",
    noun: ["syllabus", "syllabi"],
  },
};

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const type = parseBrowseType(first(sp.type));
  const q = first(sp.q);
  if (type || q) {
    return {
      title: type ? `IOE ${TYPE_COPY[type].title} — All Subjects` : `Search: ${q!.slice(0, 60)}`,
      description: type ? TYPE_COPY[type].description : "Search IOE notes, PYQs and syllabus.",
      alternates: { canonical: type ? `/resources?type=${type}` : "/resources" },
      robots: q ? { index: false } : undefined,
    };
  }
  return {
    title: "IOE Notes, PYQs and Resources by Program",
    description: "Browse IOE notes, past year questions and syllabus by program, year and semester.",
    alternates: { canonical: "/resources" },
  };
}

function TypeTabs({ active, q }: { active?: BrowseType; q: string }) {
  const tabs: Array<{ key?: BrowseType; label: string }> = [{ label: "All" }, ...BROWSE_TYPES.map((t) => ({ key: t, label: TYPE_COPY[t].title }))];
  const href = (t?: BrowseType) => {
    const sp = new URLSearchParams();
    if (t) sp.set("type", t);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/resources?${s}` : "/resources";
  };
  return (
    <nav aria-label="Resource type" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex gap-1 rounded-2xl border border-border bg-card/80 p-1 shadow-xs">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.label}>
              <Link
                href={href(t.key)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-xl px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200",
                  on ? "bg-primary-strong text-white shadow-[0_6px_16px_-8px_rgb(37_99_235/0.7)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SearchHits({ hits, q }: { hits: SearchHit[]; q: string }) {
  if (hits.length === 0) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden />}
        title={`Nothing matched “${q}”`}
        description="Try a shorter name or the subject code, or ask us to add what you need."
        action={
          <Link href="/my-requests" className={buttonVariants({ variant: "outline" })}>
            Request a resource
          </Link>
        }
      />
    );
  }
  return (
    <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
      {hits.map((h) => (
        <StaggerItem as="li" key={h.key} className="h-full">
          <Link
            href={h.href}
            className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs card-lift hover:shadow-[0_18px_44px_-22px_var(--glow-strong)]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h.kind === "subject" ? "Subject" : "Resource"}</span>
              {h.premium && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-warning">Premium</span>}
            </span>
            <span className="mt-3 text-base font-bold leading-snug tracking-[-0.015em] transition-colors group-hover:text-primary">{h.title}</span>
            <span className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{h.label}</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
              Open subject <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const type = parseBrowseType(first(sp.type));
  const page = parsePage(sp.page);

  // ---------------------------------------------------------------- filtered views
  if (type || q.length >= 2) {
    const [profile, typed, hits] = await Promise.all([
      getProfile(),
      type ? listResourcesByType(type, { q, page, pageSize: PAGE_SIZE }) : Promise.resolve(null),
      !type ? searchCatalogLabeled(q, 20) : Promise.resolve([] as SearchHit[]),
    ]);
    const copy = type ? TYPE_COPY[type] : null;
    const totalPages = typed ? Math.ceil(typed.total / PAGE_SIZE) : 0;

    return (
      <PublicShell user={shellUser(profile)}>
        <BrowseContainer>
          <PageHero
            eyebrow={copy ? copy.eyebrow : "Search"}
            title={copy ? copy.title : <>Results for &ldquo;{q}&rdquo;</>}
            description={
              copy
                ? copy.description
                : `${plural(hits.length, "match", "matches")} across subjects and resources.`
            }
            aside={type ? <TypeTile type={type} className="hidden size-16 rounded-2xl lg:flex [&_svg]:size-7" /> : undefined}
          >
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <ResourceSearch initialQuery={q} className="max-w-2xl" />
              <TypeTabs active={type} q={q} />
            </div>
          </PageHero>

          <section aria-labelledby="results-h" aria-live="polite">
            <h2 id="results-h" className="sr-only">
              Results
            </h2>
            {typed && copy ? (
              typed.rows.length === 0 ? (
                <EmptyState
                  icon={<SearchX aria-hidden />}
                  title={q ? `No ${copy.title.toLowerCase()} match “${q}”` : `No ${copy.title.toLowerCase()} published yet`}
                  description="New uploads appear here as soon as they are published. Ask for what you need and we will look for it."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {q && (
                        <Link href={`/resources?type=${type}`} className={buttonVariants({ variant: "outline" })}>
                          Clear search
                        </Link>
                      )}
                      <Link href="/my-requests" className={buttonVariants()}>
                        Request a resource
                      </Link>
                    </div>
                  }
                />
              ) : (
                <>
                  <p className="mb-5 text-sm text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">{typed.total}</span> {typed.total === 1 ? copy.noun[0] : copy.noun[1]}
                    {q ? <> matching &ldquo;{q}&rdquo;</> : null}
                  </p>
                  <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={0.04}>
                    {typed.rows.map((r) => (
                      <StaggerItem as="li" key={r.id} className="h-full">
                        <ResourceCard resource={r} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                  <Pagination basePath="/resources" params={{ type, q: q || undefined }} page={page} totalPages={totalPages} />
                </>
              )
            ) : (
              <SearchHits hits={hits} q={q} />
            )}
          </section>
        </BrowseContainer>
      </PublicShell>
    );
  }

  // ---------------------------------------------------------------- landing
  const [profile, programs, counts] = await Promise.all([getProfile(), getPrograms(), countPublishedByType()]);
  const trees = await Promise.all(programs.map((p) => getProgramTree(p.slug)));
  const cards: ProgramCardData[] = programs.map((p, i) => {
    const t = trees[i];
    const semesters = t ? t.years.flatMap((y) => y.semesters) : [];
    return {
      slug: p.slug,
      name: p.name,
      shortName: p.short_name,
      description: p.description,
      years: t?.years.length ?? 0,
      semesters: semesters.length,
      subjects: semesters.reduce((n, s) => n + s.subjects.length, 0),
    };
  });
  const totalSubjects = cards.reduce((n, c) => n + c.subjects, 0);
  const stats = [
    totalSubjects > 0 ? { label: "Subjects", value: totalSubjects } : null,
    ...BROWSE_TYPES.map((t) => (counts[t] ? { label: t === "PYQ" ? "PYQ collections" : TYPE_COPY[t].title, value: counts[t]! } : null)),
  ].filter((s): s is { label: string; value: number } => s !== null);

  return (
    <PublicShell user={shellUser(profile)}>
      <BrowseContainer>
        <PageHero
          eyebrow="Resources"
          title={
            <>
              Notes, PYQs and syllabus, <span className="text-gradient">semester by semester.</span>
            </>
          }
          description="Pick your program, then your year and semester. Every subject keeps its notes, past questions and official syllabus in one place."
          stats={stats}
        >
          <ResourceSearch className="mt-10 max-w-2xl" />
        </PageHero>

        <section aria-labelledby="programs-h">
          <SectionHeading id="programs-h" eyebrow="Programs" title="Choose your program" meta={programs.length > 0 ? plural(programs.length, "program") : undefined} />
          {cards.length === 0 ? (
            <EmptyState icon={<GraduationCap aria-hidden />} title="No programs yet" description="Programs will appear here once they are added." />
          ) : (
            <div className="space-y-6">
              {cards.map((c, i) => (
                <Reveal key={c.slug} y={24} delay={i * 0.05}>
                  <ProgramCard program={c} priority={i === 0} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="types-h" className="mt-20 sm:mt-24">
          <SectionHeading id="types-h" eyebrow="Browse by type" title="Jump straight to what you need" />
          <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-3" stagger={0.07}>
            {BROWSE_TYPES.map((t) => {
              const n = counts[t];
              return (
                <StaggerItem as="li" key={t} className="h-full">
                  <Link
                    href={`/resources?type=${t}`}
                    className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs card-lift hover:shadow-[0_20px_50px_-24px_var(--glow-strong)]"
                  >
                    <span aria-hidden className="absolute -right-16 -top-16 -z-10 size-48 rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <span className="flex items-center justify-between">
                      <TypeTile type={t} />
                      <ArrowUpRight className="size-5 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                    </span>
                    <span className="mt-6 text-xl font-extrabold tracking-[-0.025em]">{TYPE_COPY[t].title}</span>
                    <span className="mt-1 text-sm text-muted-foreground">
                      {n == null ? `All ${TYPE_STYLE[t].label.toLowerCase()} files` : n === 0 ? "Coming soon" : `${n} published`}
                    </span>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </BrowseContainer>
    </PublicShell>
  );
}
