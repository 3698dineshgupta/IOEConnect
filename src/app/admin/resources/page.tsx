import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_PUBLIC_COLUMNS, type PublicResource, type ResourceStatus, type ResourceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ResourceManager, type AdminResourceRow, type SubjectOption } from "@/components/admin/resource-manager";
import { Badge, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Notes & PYQs" };

type Slim = { id: string; subject_id: string; resource_type: ResourceType; status: ResourceStatus };
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function slot(list: Slim[], types: ResourceType[]) {
  const m = list.filter((r) => types.includes(r.resource_type));
  if (!m.length) return { label: "Missing", variant: "neutral" as const };
  const pub = m.filter((r) => r.status === "PUBLISHED").length;
  if (pub) return { label: pub > 1 ? `${pub} published` : "Published", variant: "success" as const };
  const s = m[0].status;
  return { label: s.charAt(0) + s.slice(1).toLowerCase(), variant: s === "FAILED" ? ("danger" as const) : ("warning" as const) };
}

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />}
          {c.href ? (
            <Link href={c.href} className="rounded px-1 font-medium text-primary hover:underline">{c.label}</Link>
          ) : (
            <span aria-current="page" className="px-1 font-semibold">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const tile = "block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50";

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/admin/resources");
  const sp = await searchParams;
  const programs = await getPrograms();
  const programSlug = one(sp.program) ?? programs[0]?.slug;
  const tree = programSlug ? await getProgramTree(programSlug) : null;

  const header = (
    <AdminPageHeader
      title="Notes & PYQs"
      description="Browse by year, semester and subject. Every subject has slots for Notes, past questions and other material."
      actions={
        <Link href="/admin/upload" className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover">
          <FileUp aria-hidden className="size-4" /> Upload PDF
        </Link>
      }
    />
  );

  if (!tree) {
    return (
      <>
        {header}
        <EmptyState title="No curriculum yet" description="Run the curriculum seed (supabase/seed.sql) so years, semesters and subjects appear here." />
      </>
    );
  }

  const supabase = await createServerClient();
  const { data: slimData, error: slimErr } = await supabase.from("resources").select("id, subject_id, resource_type, status").limit(10000);
  if (slimErr) console.error("[admin/resources] load failed", slimErr);
  const slim = (slimData ?? []) as Slim[];
  const bySubject = new Map<string, Slim[]>();
  for (const r of slim) bySubject.set(r.subject_id, [...(bySubject.get(r.subject_id) ?? []), r]);

  const base = `/admin/resources?program=${tree.slug}`;
  const yearNo = Number(one(sp.year));
  const year = tree.years.find((y) => y.number === yearNo);
  const sem = year?.semesters.find((s) => s.id === one(sp.sem));
  const subject = sem?.subjects.find((s) => s.id === one(sp.subject));

  const countIn = (ids: string[]) => ids.reduce((n, id) => n + (bySubject.get(id)?.length ?? 0), 0);

  let body: React.ReactNode;
  let crumbs: { label: string; href?: string }[] = [{ label: tree.short_name ?? tree.name }];

  if (!year) {
    body = (
      <>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Choose a year</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tree.years.map((y) => {
            const n = countIn(y.semesters.flatMap((s) => s.subjects.map((x) => x.id)));
            return (
              <Link key={y.id} href={`${base}&year=${y.number}`} className={tile}>
                <p className="text-xl font-extrabold">Year {y.number}</p>
                <p className="mt-1 text-sm text-muted-foreground">{y.semesters.length} semesters · {n} resources</p>
              </Link>
            );
          })}
        </div>
        {!tree.years.length && <EmptyState title="No years in this program" />}
      </>
    );
  } else if (!sem) {
    crumbs = [{ label: tree.short_name ?? tree.name, href: base }, { label: `Year ${year.number}` }];
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {year.semesters.map((s) => {
          const n = countIn(s.subjects.map((x) => x.id));
          return (
            <Link key={s.id} href={`${base}&year=${year.number}&sem=${s.id}`} className={tile}>
              <p className="text-xl font-extrabold">Semester {s.number}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.subjects.length} subjects · {n} resources</p>
            </Link>
          );
        })}
      </div>
    );
  } else if (!subject) {
    crumbs = [
      { label: tree.short_name ?? tree.name, href: base },
      { label: `Year ${year.number}`, href: `${base}&year=${year.number}` },
      { label: `Semester ${sem.number}` },
    ];
    body = sem.subjects.length ? (
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {sem.subjects.map((s) => {
          const list = bySubject.get(s.id) ?? [];
          const slots = [
            { name: "Notes", ...slot(list, ["NOTES"]) },
            { name: "PYQ", ...slot(list, ["PYQ"]) },
            { name: "Other", ...slot(list, ["REFERENCE", "LAB", "SYLLABUS", "OTHER"]) },
          ];
          return (
            <li key={s.id}>
              <Link
                href={`${base}&year=${year.number}&sem=${sem.id}&subject=${s.id}`}
                className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{s.name}</span>
                  {(s.code || s.is_elective) && (
                    <span className="text-xs text-muted-foreground">{[s.code, s.is_elective ? "Elective" : null].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {slots.map((x) => (
                    <span key={x.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {x.name}
                      <Badge variant={x.variant}>{x.label}</Badge>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <EmptyState title="No subjects in this semester" />
    );
  } else {
    crumbs = [
      { label: tree.short_name ?? tree.name, href: base },
      { label: `Year ${year.number}`, href: `${base}&year=${year.number}` },
      { label: `Semester ${sem.number}`, href: `${base}&year=${year.number}&sem=${sem.id}` },
      { label: subject.name },
    ];
    const { data, error } = await supabase
      .from("resources")
      .select(RESOURCE_PUBLIC_COLUMNS)
      .eq("subject_id", subject.id)
      .order("resource_type")
      .order("created_at", { ascending: false });
    if (error) console.error("[admin/resources] subject load failed", error);
    const rows: AdminResourceRow[] = ((data ?? []) as unknown as PublicResource[]).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      resource_type: r.resource_type,
      access_type: r.access_type,
      status: r.status,
      page_count: r.page_count,
      file_size: r.file_size,
      compressed_file_size: r.compressed_file_size,
      available_years: r.available_years ?? [],
      year_page_ranges: r.year_page_ranges ?? {},
      exam_type: r.exam_type,
      view_count: r.view_count,
      created_at: r.created_at,
    }));
    const subjects: SubjectOption[] = tree.years.flatMap((y) =>
      y.semesters.flatMap((s) => s.subjects.map((x) => ({ id: x.id, label: x.name, semesterLabel: `Year ${y.number} · Semester ${s.number}` }))),
    );
    const list = bySubject.get(subject.id) ?? [];
    const slots = [
      { name: "Notes", ...slot(list, ["NOTES"]) },
      { name: "PYQ", ...slot(list, ["PYQ"]) },
      { name: "Other", ...slot(list, ["REFERENCE", "LAB", "SYLLABUS", "OTHER"]) },
    ];
    body = (
      <>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {slots.map((x) => (
            <div key={x.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm font-semibold">{x.name}</span>
              <Badge variant={x.variant}>{x.label}</Badge>
            </div>
          ))}
        </div>
        <ResourceManager rows={rows} subjects={subjects} currentSubjectId={subject.id} />
      </>
    );
  }

  return (
    <>
      {header}
      {programs.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Program">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/admin/resources?program=${p.slug}`}
              aria-current={p.slug === tree.slug ? "true" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium",
                p.slug === tree.slug ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.short_name ?? p.name}
            </Link>
          ))}
        </div>
      )}
      <Crumbs items={crumbs} />
      {body}
    </>
  );
}
