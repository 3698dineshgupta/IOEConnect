import Link from "next/link";
import { ArrowUpRight, BookOpenText, Crown, Eye, FileClock, Lock, LogIn } from "lucide-react";
import { Badge, buttonVariants } from "@/components/ui";
import { canAccessResource } from "@/lib/access";
import type { Profile, PublicResourceView } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { TypeTile } from "./page-parts";
import type { DocBundle } from "./format";

export interface AccessContext {
  profile: Profile | null;
  requireLogin: boolean;
  slug: string;
}

export type AccessState = "open" | "login" | "premium";

/** Where a resource click goes for this viewer. Authorization is enforced again by the viewer/API. */
export function accessTarget(resource: PublicResourceView, ctx: AccessContext): { state: AccessState; href: string; label: string } {
  const premium = resource.access_type === "PREMIUM";
  if (!ctx.profile && (premium || ctx.requireLogin)) {
    return { state: "login", href: `/login?next=${encodeURIComponent(`/subject/${ctx.slug}`)}`, label: "Log in to open" };
  }
  if (canAccessResource(ctx.profile, resource)) return { state: "open", href: `/view/${resource.id}`, label: "Open" };
  return { state: "premium", href: "/premium", label: "Get Premium" };
}

export function AccessButton({ resource, ctx, className, size = "sm" }: { resource: PublicResourceView; ctx: AccessContext; className?: string; size?: "sm" | "md" | "lg" }) {
  const t = accessTarget(resource, ctx);
  const variant = t.state === "open" ? "primary" : t.state === "premium" ? "accent" : "outline";
  const Icon = t.state === "open" ? Eye : t.state === "premium" ? Lock : resource.access_type === "PREMIUM" ? Lock : LogIn;
  return (
    <Link href={t.href} className={cn(buttonVariants({ variant, size }), className)} aria-label={`${t.label}: ${resource.title}`}>
      <Icon aria-hidden /> {t.label}
    </Link>
  );
}

export function AccessBadge({ resource }: { resource: PublicResourceView }) {
  return resource.access_type === "PREMIUM" ? (
    <Badge variant="accent">
      <Crown aria-hidden /> Premium
    </Badge>
  ) : (
    <Badge variant="success">Free</Badge>
  );
}

function metaLine(r: PublicResourceView) {
  return [r.page_count ? `${r.page_count} pages` : null, r.exam_type, `Updated ${formatDate(r.updated_at)}`].filter(Boolean) as string[];
}

/** "Official syllabus" card. The chapter list lives inside the PDF; nothing is invented here. */
export function SyllabusCard({ resource, ctx, subjectName }: { resource: PublicResourceView; ctx: AccessContext; subjectName: string }) {
  return (
    <article className="bg-gradient-navy ring-gradient relative isolate overflow-hidden rounded-3xl border border-white/10 p-6 text-white shadow-lg sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_90%_at_90%_10%,#000_10%,transparent_75%)]" style={{ ["--grid-line" as string]: "rgba(148,163,184,0.12)" }} />
        <div className="glow-blob -right-16 -top-16 size-72 opacity-80" />
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-cyan-bright ring-1 ring-inset ring-white/15">
            <BookOpenText className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-bright">Official syllabus</p>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-[-0.025em] sm:text-2xl">{resource.title || `${subjectName} syllabus`}</h3>
            <p className="mt-2 text-sm text-white/65">Chapters, teaching hours and the marking scheme are in the PDF. View-only.</p>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
              {metaLine(resource).map((m) => (
                <span key={m}>{m}</span>
              ))}
              {resource.access_type === "PREMIUM" && <span className="font-semibold text-accent">Premium</span>}
            </p>
          </div>
        </div>
        <AccessButton resource={resource} ctx={ctx} size="lg" className="w-full shrink-0 sm:w-auto" />
      </div>
    </article>
  );
}

/** Card for notes and other resources. */
export function ResourceTile({ resource, ctx }: { resource: PublicResourceView; ctx: AccessContext }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_44px_-24px_var(--glow-strong)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <TypeTile type={resource.resource_type} />
        <AccessBadge resource={resource} />
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug tracking-[-0.015em]">{resource.title}</h3>
      {resource.description && <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{resource.description}</p>}
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {metaLine(resource).map((m) => (
          <span key={m}>{m}</span>
        ))}
      </p>
      <div className="mt-auto pt-5">
        <AccessButton resource={resource} ctx={ctx} className="w-full sm:w-auto" />
      </div>
    </article>
  );
}

/**
 * A document that was split into parts on upload (big PDFs): one card, every part listed inside it,
 * each part opening in the reader. Single-part documents use the plain ResourceTile.
 */
export function BundleTile({ bundle, ctx }: { bundle: DocBundle; ctx: AccessContext }) {
  if (bundle.parts.length === 1) return <ResourceTile resource={bundle.parts[0]} ctx={ctx} />;
  const first = bundle.parts[0];
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-[0_18px_44px_-24px_var(--glow-strong)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <TypeTile type={first.resource_type} />
        {bundle.premium ? (
          <Badge variant="accent">
            <Crown aria-hidden /> Premium
          </Badge>
        ) : (
          <Badge variant="success">Free</Badge>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold leading-snug tracking-[-0.015em]">{bundle.title}</h3>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {bundle.parts.length} parts{bundle.pages ? ` · ${bundle.pages} pages in total` : ""} · read in order
      </p>
      <ol className="mt-4 space-y-2 border-t border-border pt-4">
        {bundle.parts.map((r, i) => (
          <li key={r.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm">
              <span className="font-semibold">Part {i + 1}</span>
              {r.page_count ? <span className="text-muted-foreground"> · {r.page_count} pages</span> : null}
            </span>
            <AccessButton resource={r} ctx={ctx} />
          </li>
        ))}
      </ol>
    </article>
  );
}

/**
 * One PYQ resource. With `available_years`, a horizontal timeline of year cards (each opens the
 * collection in the view-only reader; page ranges shown when known). Without years — the common
 * case for combined PDFs — a single clean "Past questions" card.
 */
export function PyqCollection({ resource, ctx }: { resource: PublicResourceView; ctx: AccessContext }) {
  const years = [...new Set(resource.available_years ?? [])].filter(Number.isFinite).sort((a, b) => a - b);
  const target = accessTarget(resource, ctx);

  if (years.length === 0) {
    return (
      <article className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-violet/35 hover:shadow-[0_18px_44px_-24px_var(--glow-violet)] sm:flex-row sm:items-center sm:p-6">
        <TypeTile type="PYQ" className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet">Past questions</p>
          <h3 className="mt-1 text-base font-bold leading-snug tracking-[-0.015em] sm:text-lg">{resource.title}</h3>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {metaLine(resource).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AccessBadge resource={resource} />
          <AccessButton resource={resource} ctx={ctx} />
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-border bg-card/80 p-5 shadow-xs sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <TypeTile type="PYQ" />
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug tracking-[-0.015em] sm:text-lg">{resource.title}</h3>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {years.length} year{years.length === 1 ? "" : "s"}
              </span>
              {metaLine(resource).map((m) => (
                <span key={m}>{m}</span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccessBadge resource={resource} />
          <AccessButton resource={resource} ctx={ctx} />
        </div>
      </header>

      <div className="relative -mx-5 mt-6 sm:-mx-6">
        <ol aria-label={`Years in ${resource.title}`} className="no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 pt-6 sm:px-6">
          <span aria-hidden className="pointer-events-none absolute left-5 right-5 top-[11px] h-px bg-linear-to-r from-violet/50 via-border-strong to-transparent sm:left-6" />
          {years.map((y) => {
            const range = resource.year_page_ranges?.[String(y)];
            return (
              <li key={y} className="relative shrink-0 snap-start">
                <span aria-hidden className="absolute -top-[19px] left-4 size-2.5 rounded-full border-2 border-violet bg-card" />
                <Link
                  href={target.href}
                  aria-label={`${y} — ${target.label}${range ? `, pages ${range[0]} to ${range[1]}` : ""}`}
                  className="group/year flex w-36 flex-col rounded-2xl border border-border bg-background/70 p-4 transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-1 hover:border-violet/45 hover:bg-card hover:shadow-[0_16px_36px_-18px_var(--glow-violet),0_0_0_4px_var(--glow-violet)] focus-visible:-translate-y-1"
                >
                  <span className="font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em]">{y}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{range ? `pp. ${range[0]}–${range[1]}` : "In this collection"}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet">
                    {target.state === "open" ? (
                      <>
                        View <ArrowUpRight className="size-3.5 transition-transform group-hover/year:-translate-y-0.5 group-hover/year:translate-x-0.5" aria-hidden />
                      </>
                    ) : target.state === "premium" ? (
                      <>
                        <Lock className="size-3.5" aria-hidden /> Premium
                      </>
                    ) : (
                      <>
                        <LogIn className="size-3.5" aria-hidden /> Log in
                      </>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      {Object.keys(resource.year_page_ranges ?? {}).length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileClock className="size-3.5" aria-hidden /> Every year opens the full collection; page numbers show where each paper starts.
        </p>
      )}
    </article>
  );
}

/** Honest per-section empty state with a request CTA. */
export function SectionEmpty({ what, slug }: { what: string; slug: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border-strong bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">No {what} published yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask for it and we will look for a copy.</p>
      </div>
      <Link href={`/my-requests?subject=${encodeURIComponent(slug)}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Request {what}
      </Link>
    </div>
  );
}
