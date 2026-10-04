import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { SubjectIcon } from "@/components/scene";
import { buttonVariants } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getSubjectBySlug, getSubjectResources } from "@/lib/curriculum";
import { getSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { semesterHref, shellUser, summarizeResources, toRoman, yearRange, yearSlug } from "@/components/resources/format";
import { Breadcrumbs, BrowseContainer, SectionHeading } from "@/components/resources/page-parts";
import { subjectFacts } from "@/components/resources/subject-card";
import { RememberSubject } from "@/components/resources/RememberSubject";
import { scopeProfileToSubject } from "@/lib/program-premium";
import { BundleTile, PyqCollection, SectionEmpty, SyllabusCard, type AccessContext } from "@/components/resources/subject-sections";

type Props = { params: Promise<{ subject: string }> };

const subjectTitle = (name: string) => `${/^ioe\b/i.test(name) ? "" : "IOE "}${name} Notes & PYQs`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) return { title: "Subject not found", robots: { index: false } };
  const resources = await getSubjectResources(subject.id);
  const s = summarizeResources(resources);
  const range = yearRange(s.years);
  const description = `${subject.name} (${subject.program.name}, Semester ${toRoman(subject.semester.number)}): ${
    s.notesDocs.length ? "notes" : "resources"
  }${range ? ` and past year questions ${range}` : s.pyq.length ? " and past questions" : ""}${s.syllabus.length ? ", official syllabus" : ""} for IOE students.`;
  const title = subjectTitle(subject.name);
  return {
    title,
    description,
    alternates: { canonical: `/subject/${subject.slug}` },
    openGraph: { title: `${title} | IOE Connect`, description, type: "article", url: `/subject/${subject.slug}` },
    twitter: { card: "summary", title: `${title} | IOE Connect`, description },
  };
}

export default async function SubjectPage({ params }: Props) {
  const { subject: slug } = await params;
  const [subject, profile, resourceSettings] = await Promise.all([getSubjectBySlug(slug), getProfile(), getSetting("resources")]);
  if (!subject) notFound();
  const resources = await getSubjectResources(subject.id);
  const s = summarizeResources(resources);
  // Premium is per program: a premium member of this subject's program (or one sharing it) gets in.
  const ctx: AccessContext = { profile: await scopeProfileToSubject(profile, subject.id), requireLogin: !!resourceSettings?.require_login_for_free, slug: subject.slug };
  const facts = subjectFacts(subject);
  const range = yearRange(s.years);

  const sem = toRoman(subject.semester.number);
  const signedOutPremium = !profile && resources.some((r) => r.access_type === "PREMIUM");
  const requestHref = `/my-requests?subject=${encodeURIComponent(subject.slug)}`;

  const anchors = [
    { id: "syllabus", label: "Syllabus", count: s.syllabus.length },
    { id: "notes", label: "Notes", count: s.notesDocs.length },
    { id: "pyq", label: "PYQs", count: s.pyq.length },
    ...(s.other.length ? [{ id: "other", label: "Other", count: s.other.length }] : []),
  ];

  const factPills = [
    subject.code ? { k: "Code", v: subject.code, mono: true } : null,
    { k: "Semester", v: sem },
    { k: "Year", v: toRoman(subject.year.number) },
    facts.ltp ? { k: "L-T-P", v: facts.ltp, mono: true } : null,
    facts.hours ? { k: "Lecture hours", v: String(facts.hours), mono: true } : null,
    facts.marks ? { k: "Total marks", v: String(facts.marks), mono: true } : null,
    facts.credits ? { k: "Credits", v: String(facts.credits), mono: true } : null,
  ].filter((x): x is { k: string; v: string; mono?: boolean } => x !== null);

  return (
    <PublicShell user={shellUser(profile)}>
      <RememberSubject slug={subject.slug} />
      <BrowseContainer>
        <Breadcrumbs
          items={[
            { label: "Resources", href: "/resources" },
            { label: subject.program.name, href: `/resources/${subject.program.slug}` },
            { label: `Year ${toRoman(subject.year.number)}`, href: `/resources/${subject.program.slug}/${yearSlug(subject.year.number)}` },
            { label: `Semester ${sem}`, href: semesterHref(subject.program.slug, subject.year.number, subject.semester.number) },
            { label: subject.name },
          ]}
        />

        {/* ------------------------------------------------------------ hero */}
        <header className="relative isolate mb-10 overflow-hidden rounded-[1.75rem] border border-border bg-card/80 p-5 shadow-sm backdrop-blur sm:rounded-[2rem] sm:p-10 lg:p-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="bg-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_70%_100%_at_100%_0%,#000_10%,transparent_70%)]" />
            <div className="glow-blob -right-24 -top-24 size-96 opacity-70" />
            <div className="glow-blob glow-blob-violet -bottom-32 left-1/3 size-72 opacity-60" />
          </div>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="eyebrow">
                <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_var(--glow)]" />
                {subject.program.short_name || subject.program.name} · Semester {sem}
                {subject.is_elective ? ` · ${subject.elective_group || "Elective"}` : ""}
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">{subject.name}</h1>
              {subject.description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{subject.description}</p>}
              <dl className="mt-7 flex flex-wrap gap-2">
                {factPills.map((f) => (
                  <div key={f.k} className="flex items-baseline gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{f.k}</dt>
                    <dd className={cn("text-sm font-bold", f.mono && "font-mono font-semibold")}>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="hidden shrink-0 items-center gap-6 sm:flex lg:flex-col lg:items-end">
              <SubjectIcon slug={subject.slug} name={subject.name} size={96} className="hidden rounded-3xl shadow-[0_20px_50px_-20px_var(--glow-strong)] sm:inline-grid" />
              <ul aria-label="Availability" className="grid w-full grid-cols-3 gap-2 sm:w-auto lg:grid-cols-1 lg:gap-1.5">
                {[
                  { label: "Syllabus", on: s.syllabus.length > 0, detail: s.syllabus.length ? "Official PDF" : "Coming soon" },
                  { label: "Notes", on: s.notesDocs.length > 0, detail: s.notesDocs.length ? `${s.notesDocs.length} set${s.notesDocs.length === 1 ? "" : "s"}` : "Coming soon" },
                  { label: "PYQs", on: s.pyq.length > 0, detail: s.pyq.length ? range || `${s.pyq.length} file${s.pyq.length === 1 ? "" : "s"}` : "Coming soon" },
                ].map((a) => (
                  <li key={a.label} className="flex items-center gap-2 text-sm lg:justify-end">
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", a.on ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-border-strong")} />
                    <span className="font-semibold">{a.label}</span>
                    <span className="hidden truncate text-muted-foreground min-[420px]:inline">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <nav aria-label="On this page" className="mt-7 sm:mt-8">
            <ul className="flex flex-wrap gap-1 rounded-2xl border border-border bg-background/70 p-1 sm:inline-flex">
              {anchors.map((a) => (
                <li key={a.id} className="max-sm:flex-1">
                  <a
                    href={`#${a.id}`}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm sm:h-9 sm:gap-2 sm:px-4 max-sm:w-full font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground hover:shadow-xs"
                  >
                    {a.label}
                    <span className={cn("rounded-full px-1.5 font-mono text-[11px]", a.count ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground")}>{a.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {signedOutPremium && (
          <p className="mb-10 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-2xl border border-accent/25 bg-accent-soft/60 px-5 py-4 text-sm">
            Some files here are premium.
            <Link href={`/login?next=${encodeURIComponent(`/subject/${subject.slug}`)}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
            to check your access, or
            <Link href="/premium" className="font-semibold text-primary underline-offset-4 hover:underline">
              see Premium plans
            </Link>
            .
          </p>
        )}

        <div className="space-y-16 sm:space-y-20">
          {/* ------------------------------------------------------ syllabus */}
          <section id="syllabus" aria-labelledby="syllabus-h">
            <SectionHeading id="syllabus-h" eyebrow="Syllabus" title="Official syllabus" meta={s.syllabus.length ? "Opens in the view-only reader." : undefined} />
            {s.syllabus.length === 0 ? (
              <SectionEmpty what="syllabus" slug={subject.slug} />
            ) : (
              <div className="space-y-4">
                {s.syllabus.map((r) => (
                  <Reveal key={r.id} y={16}>
                    <SyllabusCard resource={r} ctx={ctx} subjectName={subject.name} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {/* --------------------------------------------------------- notes */}
          <section id="notes" aria-labelledby="notes-h">
            <SectionHeading id="notes-h" eyebrow="Notes" title="Notes" meta={s.notesDocs.length ? `${s.notesDocs.length} set${s.notesDocs.length === 1 ? "" : "s"}` : undefined} />
            {s.notesDocs.length === 0 ? (
              <SectionEmpty what="notes" slug={subject.slug} />
            ) : (
              <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
                {s.notesDocs.map((b) => (
                  <StaggerItem as="li" key={b.key} className="h-full">
                    <BundleTile bundle={b} ctx={ctx} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          {/* ----------------------------------------------------------- pyq */}
          <section id="pyq" aria-labelledby="pyq-h">
            <SectionHeading
              id="pyq-h"
              eyebrow="Past year questions"
              title="PYQs"
              meta={s.pyq.length ? [range ? `Years ${range}` : null, `${s.pyq.length} file${s.pyq.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ") : undefined}
            />
            {s.pyq.length === 0 ? (
              <SectionEmpty what="past questions" slug={subject.slug} />
            ) : (
              <div className="space-y-4">
                {s.pyq.map((r) => (
                  <Reveal key={r.id} y={16}>
                    <PyqCollection resource={r} ctx={ctx} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          {/* --------------------------------------------------------- other */}
          {s.other.length > 0 && (
            <section id="other" aria-labelledby="other-h">
              <SectionHeading id="other-h" eyebrow="More" title="Other resources" />
              <Stagger as="ul" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
                {s.otherDocs.map((b) => (
                  <StaggerItem as="li" key={b.key} className="h-full">
                    <BundleTile bundle={b} ctx={ctx} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}

          {/* ------------------------------------------------------- request */}
          <section aria-labelledby="request-h" className="relative isolate overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div aria-hidden className="glow-blob -right-20 -top-20 -z-10 size-64 opacity-50" />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-inset ring-primary/15">
                  <MessageSquarePlus className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 id="request-h" className="text-lg font-extrabold tracking-[-0.02em]">
                    Missing something for {subject.name}?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">Request notes, a specific year&apos;s paper or the syllabus and track it from your account.</p>
                </div>
              </div>
              <Link href={requestHref} className={cn(buttonVariants(), "w-full shrink-0 sm:w-auto")}>
                Request Resource
              </Link>
            </div>
          </section>
        </div>
      </BrowseContainer>
    </PublicShell>
  );
}
