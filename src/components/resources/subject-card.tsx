import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import { Stagger, StaggerItem, TiltCard } from "@/components/motion";
import { SubjectIcon } from "@/components/scene";
import { formatDate } from "@/lib/utils";
import type { PublicResourceView, Subject } from "@/lib/types";
import { summarizeResources, toRoman, yearRange, type DocBundle } from "./format";

/** Columns added by migration 20261005000008; may be absent at runtime until it is applied. */
export function subjectFacts(subject: Partial<Pick<Subject, "ltp" | "full_marks" | "lecture_hours" | "credits">>) {
  const ltp = typeof subject.ltp === "string" && subject.ltp.trim() ? subject.ltp.trim() : null;
  const marks = typeof subject.full_marks === "number" && subject.full_marks > 0 ? subject.full_marks : null;
  const hours = typeof subject.lecture_hours === "number" && subject.lecture_hours > 0 ? subject.lecture_hours : null;
  const credits = typeof subject.credits === "number" && subject.credits > 0 ? subject.credits : null;
  return { ltp, marks, hours, credits };
}

function AvailabilityChip({
  label,
  docs,
  slug,
  anchor,
  detail,
}: {
  label: string;
  docs: DocBundle[];
  slug: string;
  anchor: string;
  detail?: string;
}) {
  if (docs.length === 0) {
    return (
      <span
        aria-label={`${label}: coming soon`}
        className="relative z-10 flex h-14 flex-col justify-center rounded-xl border border-dashed border-border-strong/70 px-2.5 text-muted-foreground/80"
      >
        <span className="text-[10px] font-bold tracking-[0.1em]">{label}</span>
        <span className="mt-0.5 text-[11px] leading-none">Coming soon</span>
      </span>
    );
  }
  // A single one-part document opens straight in the reader; anything else goes to the subject page.
  const href = docs.length === 1 && docs[0].parts.length === 1 ? `/view/${docs[0].parts[0].id}` : `/subject/${slug}#${anchor}`;
  return (
    <Link
      href={href}
      className="relative z-10 flex h-14 flex-col justify-center rounded-xl border border-primary/20 bg-primary-soft px-2.5 text-primary transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_20px_-10px_var(--glow-strong)]"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em]">
        <span aria-hidden className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
        {label}
      </span>
      <span className="mt-0.5 truncate text-[11px] font-medium leading-none text-foreground/75">{detail}</span>
    </Link>
  );
}

export function SubjectCard({
  subject,
  resources,
  number,
  semesterNumber,
}: {
  subject: Subject;
  resources: PublicResourceView[];
  /** Position in the semester's sort order (1-based). */
  number?: number;
  semesterNumber?: number;
}) {
  const s = summarizeResources(resources);
  const range = yearRange(s.years);
  const facts = subjectFacts(subject);
  const meta = [
    semesterNumber ? `Semester ${toRoman(semesterNumber)}` : null,
    facts.ltp ? `L-T-P ${facts.ltp}` : null,
    facts.marks ? `${facts.marks} marks` : null,
    facts.credits ? `${facts.credits} credits` : null,
  ].filter(Boolean);

  return (
    <TiltCard className="h-full rounded-2xl" maxTilt={4} scale={1.01} glare>
      <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-300 hover:border-primary/35 hover:shadow-[0_24px_60px_-28px_var(--glow-strong)] sm:p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 -z-10 size-56 rounded-full bg-[radial-gradient(circle,var(--glow)_0%,transparent_65%)] opacity-50 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <div className="flex items-start justify-between gap-3">
          <SubjectIcon slug={subject.slug} name={subject.name} size={48} animated="hover" className="pointer-events-none" />
          <div className="flex flex-col items-end gap-2">
            {number ? (
              <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground" aria-label={`Subject ${number}`}>
                {String(number).padStart(2, "0")}
              </span>
            ) : null}
            {s.hasPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-inset ring-accent/25">
                <Crown className="size-3" aria-hidden /> Premium
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-5 text-[1.0625rem] font-bold leading-snug tracking-[-0.02em]">
          <Link
            href={`/subject/${subject.slug}`}
            className="-my-2.5 block py-2.5 outline-none transition-colors after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {subject.name}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {subject.code && <span className="font-mono font-medium text-foreground/70">{subject.code}</span>}
          {meta.map((m, i) => (
            <span key={m} className="inline-flex items-center gap-2">
              {(subject.code || i > 0) && <span aria-hidden className="size-0.5 rounded-full bg-current opacity-60" />}
              {m}
            </span>
          ))}
        </p>

        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <AvailabilityChip label="SYLLABUS" docs={s.syllabusDocs} slug={subject.slug} anchor="syllabus" detail={s.syllabusDocs.length > 1 ? `${s.syllabusDocs.length} files` : "Official PDF"} />
          <AvailabilityChip label="NOTES" docs={s.notesDocs} slug={subject.slug} anchor="notes" detail={s.notesDocs.length === 1 ? "1 set" : `${s.notesDocs.length} sets`} />
          <AvailabilityChip label="PYQ" docs={s.pyqDocs} slug={subject.slug} anchor="pyq" detail={range || (s.pyqDocs.length === 1 ? "1 file" : `${s.pyqDocs.length} files`)} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-muted-foreground">
          <span className="truncate">{s.updatedAt ? `Updated ${formatDate(s.updatedAt)}` : "No uploads yet"}</span>
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-[background-color,border-color,color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </article>
    </TiltCard>
  );
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3";

/** Subject cards in sort order; electives are grouped by `elective_group` ("Elective I — choose one"). */
export function SubjectGrid({
  subjects,
  resourcesBySubject,
  semesterNumber,
}: {
  subjects: Subject[];
  resourcesBySubject: Map<string, PublicResourceView[]>;
  semesterNumber?: number;
}) {
  const order = new Map(subjects.map((s, i) => [s.id, i + 1]));
  const core = subjects.filter((s) => !s.is_elective);
  const electiveGroups = new Map<string, Subject[]>();
  for (const s of subjects.filter((x) => x.is_elective)) {
    const key = s.elective_group ?? "";
    electiveGroups.set(key, [...(electiveGroups.get(key) ?? []), s]);
  }
  const card = (s: Subject) => (
    <StaggerItem as="li" key={s.id} className="h-full">
      <SubjectCard subject={s} resources={resourcesBySubject.get(s.id) ?? []} number={order.get(s.id)} semesterNumber={semesterNumber} />
    </StaggerItem>
  );

  return (
    <div className="space-y-10">
      {core.length > 0 && (
        <Stagger as="ul" className={GRID} stagger={0.06}>
          {core.map(card)}
        </Stagger>
      )}
      {[...electiveGroups.entries()].map(([group, items], i) => (
        <section
          key={group || `elective-${i}`}
          aria-labelledby={`electives-${semesterNumber ?? 0}-${i}`}
          className="relative rounded-3xl border border-dashed border-violet/30 bg-[color-mix(in_srgb,var(--violet)_4%,transparent)] p-4 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h3 id={`electives-${semesterNumber ?? 0}-${i}`} className="text-lg font-extrabold tracking-[-0.02em]">
              {group || "Elective"}
            </h3>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--violet)_14%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-violet ring-1 ring-inset ring-violet/25">
              Choose one
            </span>
            <span className="text-sm text-muted-foreground">{items.length} options</span>
          </div>
          <Stagger as="ul" className={GRID} stagger={0.06}>
            {items.map(card)}
          </Stagger>
        </section>
      ))}
    </div>
  );
}
