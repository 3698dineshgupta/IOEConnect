import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, ChevronLeft, ChevronRight, Crown, FileClock, FileText, NotebookText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/motion";
import { cn, formatDate } from "@/lib/utils";
import { RESOURCE_TYPE_LABELS, type PublicResourceView, type ResourceType } from "@/lib/types";
import { yearRange } from "./format";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 md:pb-12", className)}>{children}</div>;
}

/** Wide container used by the browse pages (matches the floating navbar width). */
export function BrowseContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10 md:pb-20 lg:px-8", className)}>{children}</div>;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  // On phones the middle crumbs collapse into an ellipsis so the trail never clips or wraps awkwardly.
  const hideFrom = 1;
  const hideTo = items.length - 3;
  const collapsed = hideTo >= hideFrom;
  return (
    <nav aria-label="Breadcrumb" className="mb-6 min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
        {items.map((it, i) => {
          const hidden = collapsed && i >= hideFrom && i <= hideTo;
          return (
            <React.Fragment key={`${it.label}-${i}`}>
              {collapsed && i === hideFrom && (
                <li aria-hidden className="flex items-center gap-1.5 sm:hidden">
                  <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                  <span>…</span>
                </li>
              )}
              <li className={cn("min-w-0 max-w-full items-center gap-1.5", hidden ? "hidden sm:flex" : "flex")}>
                {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />}
                {it.href ? (
                  <Link href={it.href} className="link-underline inline-flex min-h-10 min-w-10 items-center rounded-sm transition-colors hover:text-foreground sm:min-h-8 sm:min-w-0">
                    {it.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="inline-flex min-h-10 min-w-0 items-center break-words font-semibold text-foreground sm:min-h-8">
                    {it.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
    </header>
  );
}

export interface HeroStat {
  label: string;
  value: number;
}

/** Page header for browse pages: eyebrow, large tight heading, copy and real DB counts. */
export function PageHero({
  eyebrow,
  title,
  description,
  stats = [],
  aside,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  stats?: HeroStat[];
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative mb-12 sm:mb-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && (
            <p className="eyebrow">
              <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_0_4px_var(--glow)]" />
              {eyebrow}
            </p>
          )}
          <h1 className="mt-4 text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>}
        </div>
        {aside}
      </div>
      {stats.length > 0 && (
        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:inline-grid sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse gap-1 bg-card/90 px-5 py-4 sm:min-w-36 sm:px-6">
              <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums tracking-[-0.03em] sm:text-3xl">
                <CountUp value={s.value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </header>
  );
}

/** Section heading with optional eyebrow, meta line and trailing action. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  meta,
  action,
  as: Tag = "h2",
  className,
}: {
  id?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>}
        <Tag id={id} tabIndex={id ? -1 : undefined} data-section-heading={id ? "" : undefined} className="text-2xl font-extrabold tracking-[-0.03em] outline-none sm:text-[1.75rem]">
          {title}
        </Tag>
        {meta && <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>}
      </div>
      {action}
    </div>
  );
}

/** Visual identity per resource type (icon + tint), shared by cards and chips. */
export const TYPE_STYLE: Record<ResourceType, { icon: typeof FileText; tile: string; label: string }> = {
  NOTES: { icon: NotebookText, tile: "bg-primary-soft text-primary ring-primary/15", label: "Notes" },
  PYQ: { icon: FileClock, tile: "bg-[color-mix(in_srgb,var(--violet)_12%,transparent)] text-violet ring-violet/20", label: "PYQ" },
  SYLLABUS: { icon: BookOpenText, tile: "bg-[color-mix(in_srgb,var(--cyan)_12%,transparent)] text-cyan ring-cyan/20", label: "Syllabus" },
  REFERENCE: { icon: FileText, tile: "bg-muted text-muted-foreground ring-border", label: "Reference" },
  LAB: { icon: FileText, tile: "bg-muted text-muted-foreground ring-border", label: "Lab" },
  OTHER: { icon: FileText, tile: "bg-muted text-muted-foreground ring-border", label: "Other" },
};

export function TypeTile({ type, className }: { type: ResourceType; className?: string }) {
  const t = TYPE_STYLE[type] ?? TYPE_STYLE.OTHER;
  const Icon = t.icon;
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", t.tile, className)}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/** Card for flat resource grids (type filters, search). Opens the view-only viewer. */
export function ResourceCard({ resource }: { resource: PublicResourceView }) {
  const range = resource.resource_type === "PYQ" ? yearRange(resource.available_years) : "";
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs card-lift hover:shadow-[0_18px_44px_-22px_var(--glow-strong)]">
      <div className="flex items-start justify-between gap-3">
        <TypeTile type={resource.resource_type} />
        {resource.access_type === "PREMIUM" ? (
          <Badge variant="accent">
            <Crown aria-hidden /> Premium
          </Badge>
        ) : (
          <Badge variant="success">Free</Badge>
        )}
      </div>
      <h3 className="mt-4 line-clamp-2 text-base font-bold leading-snug tracking-[-0.015em]">
        <Link href={`/view/${resource.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {resource.title}
        </Link>
      </h3>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {resource.subject_name}
        {resource.subject_code ? <span className="font-mono text-xs"> · {resource.subject_code}</span> : null}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-muted-foreground">
        <span className="truncate">
          {[RESOURCE_TYPE_LABELS[resource.resource_type], range, resource.page_count ? `${resource.page_count} pages` : null].filter(Boolean).join(" · ")}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-[background-color,border-color,color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>
    </article>
  );
}

/** Compact row for a flat resource list (dashboard). */
export function ResourceRow({ resource, meta }: { resource: PublicResourceView; meta?: string }) {
  const range = resource.resource_type === "PYQ" ? yearRange(resource.available_years) : "";
  return (
    <li>
      <Link
        href={`/view/${resource.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md"
      >
        <TypeTile type={resource.resource_type} className="size-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{resource.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {[resource.subject_name, RESOURCE_TYPE_LABELS[resource.resource_type], range, meta].filter(Boolean).join(" · ")}
          </span>
        </span>
        {resource.access_type === "PREMIUM" && (
          <Badge variant="accent">
            <Crown aria-hidden /> Premium
          </Badge>
        )}
        <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(resource.updated_at)}</span>
      </Link>
    </li>
  );
}

export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const link =
    "inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-xs transition-[border-color,box-shadow,color] duration-200 hover:border-primary/40 hover:text-primary hover:shadow-md";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={link}>
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={link}>
          Next <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

type NavTarget = { href: string; label: string } | null | undefined;

/** Previous / next links at the foot of year and semester pages. */
export function PrevNext({ prev, next, label }: { prev?: NavTarget; next?: NavTarget; label: string }) {
  if (!prev && !next) return null;
  const card = "group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs card-lift";
  return (
    <nav aria-label={label} className="mt-20 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
      {prev ? (
        <Link href={prev.href} rel="prev" className={card}>
          <ChevronLeft className="size-5 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
          <span>
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="block font-bold tracking-[-0.015em]">{prev.label}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link href={next.href} rel="next" className={cn(card, "justify-end text-right")}>
          <span>
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="block font-bold tracking-[-0.015em]">{next.label}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

export function parsePage(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 1000) : 1;
}

export function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

/** Plural helper: plural(3, "subject") -> "3 subjects". */
export function plural(n: number, word: string, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}
