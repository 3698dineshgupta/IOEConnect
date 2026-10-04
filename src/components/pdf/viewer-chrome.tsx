// Shared, hook-free viewer chrome: usable from the server page (lock/empty states) and from
// the client viewer. No "use client" on purpose.
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { BackLink } from "./BackLink";

const VIEWER_CSS = `
.pdfv-stage{
  background-color:#e8edf3;
  background-image:
    radial-gradient(70% 55% at 50% 0%,rgb(255 255 255/.85) 0%,transparent 70%),
    linear-gradient(to right,rgb(15 23 42/.045) 1px,transparent 1px),
    linear-gradient(to bottom,rgb(15 23 42/.045) 1px,transparent 1px);
  background-size:100% 100%,28px 28px,28px 28px;
  background-position:center top;
  scrollbar-width:thin;
  scrollbar-color:rgb(71 85 105/.38) transparent;
  scrollbar-gutter:stable;
  overscroll-behavior:contain;
}
.dark .pdfv-stage{
  background-color:#060b14;
  background-image:
    radial-gradient(80% 50% at 50% -5%,rgb(37 99 235/.13) 0%,transparent 70%),
    linear-gradient(to right,rgb(255 255 255/.022) 1px,transparent 1px),
    linear-gradient(to bottom,rgb(255 255 255/.022) 1px,transparent 1px);
  scrollbar-color:rgb(148 163 184/.28) transparent;
}
.pdfv-page{
  background:#fff;
  box-shadow:0 0 0 1px rgb(15 23 42/.07),0 1px 2px rgb(15 23 42/.06),0 10px 24px -10px rgb(15 23 42/.18),0 30px 60px -30px rgb(15 23 42/.30);
}
.dark .pdfv-page{
  box-shadow:0 0 0 1px rgb(255 255 255/.07),0 2px 4px rgb(0 0 0/.45),0 18px 44px -14px rgb(0 0 0/.75);
}
.pdfv-glass{
  background:color-mix(in srgb,var(--surface-elevated) 80%,transparent);
  -webkit-backdrop-filter:blur(18px) saturate(1.6);
  backdrop-filter:blur(18px) saturate(1.6);
  border:1px solid color-mix(in srgb,var(--foreground) 9%,transparent);
  box-shadow:0 1px 0 rgb(255 255 255/.5) inset,0 12px 32px -12px rgb(7 17 31/.28),0 2px 6px -2px rgb(7 17 31/.10);
}
.dark .pdfv-glass{
  background:color-mix(in srgb,#0b1628 82%,transparent);
  border-color:rgb(255 255 255/.09);
  box-shadow:0 1px 0 rgb(255 255 255/.05) inset,0 16px 40px -12px rgb(0 0 0/.8);
}
.pdfv-canvas{opacity:0;transition:opacity .32s var(--ease-out)}
.pdfv-canvas[data-ready]{opacity:1}
.pdfv-chrome{transition:opacity .3s var(--ease-out),transform .3s var(--ease-out)}
.pdfv-chrome[data-hidden]{opacity:0}
.pdfv-chrome[data-hidden],.pdfv-chrome[data-hidden] *{pointer-events:none!important}
@media (prefers-reduced-motion:reduce){.pdfv-canvas,.pdfv-chrome{transition-duration:.12s}}
@media print{[data-pdf-viewer]{display:none!important}[data-pdf-print-note]{display:block!important}}
`;

/** Viewer stylesheet. React hoists and dedupes it by href. */
export function ViewerStyles() {
  return (
    <style href="ioe-pdf-viewer" precedence="medium">
      {VIEWER_CSS}
    </style>
  );
}

export interface ViewerMeta {
  title: string;
  backHref: string;
  backLabel: string;
  /** Subjects that can show this document (it and its same-course twins); lets Back return to the one being browsed. */
  backTargets?: import("./BackLink").BackTarget[];
  subjectName: string | null;
  typeLabel: string;
  access: "FREE" | "PREMIUM";
  pageCount: number | null;
}

const chip = "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-px text-[11px] font-semibold leading-4 ring-1 ring-inset";

export function ViewerTopBar({
  meta,
  progress,
  actions,
  className,
}: {
  meta: ViewerMeta;
  /** 0..1 reading position; draws the progress hairline under the bar. */
  progress?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-surface-elevated/85 pl-1.5 pr-2 backdrop-blur-xl backdrop-saturate-150 sm:gap-3 sm:pl-3 sm:pr-3",
        className,
      )}
    >
      <BackLink
        href={meta.backHref}
        label={meta.backLabel}
        targets={meta.backTargets}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted sm:size-10"
      >
        <ArrowLeft className="size-4.5" aria-hidden />
      </BackLink>
      <Link href="/" aria-label="IOE Connect home" className="hidden shrink-0 rounded-lg sm:inline-flex">
        <LogoMark className="size-7" glow={false} />
      </Link>
      <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border sm:block" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[0.9375rem] font-semibold leading-5 tracking-tight text-foreground">{meta.title}</h1>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
          {meta.subjectName && <span className="min-w-0 truncate">{meta.subjectName}</span>}
          <span className={cn(chip, "bg-primary-soft text-primary ring-primary/15")}>{meta.typeLabel}</span>
          {meta.access === "PREMIUM" ? (
            <span className={cn(chip, "bg-accent-soft text-warning ring-accent/25")}>
              <Crown className="size-3" aria-hidden /> Premium
            </span>
          ) : (
            <span className={cn(chip, "bg-success-soft text-success ring-success/15")}>Free</span>
          )}
          {meta.pageCount ? (
            <span className="hidden shrink-0 tabular-nums sm:inline">
              {meta.pageCount} {meta.pageCount === 1 ? "page" : "pages"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {actions}
        <ThemeToggle className="size-11 rounded-xl sm:size-10" />
      </div>

      {progress != null && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
          <div
            className="h-full origin-left bg-gradient-brand transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
          />
        </div>
      )}
    </header>
  );
}

/** Full-viewport frame for states without a document (locked, still processing, failed). */
export function ViewerFrame({ meta, children, actions }: { meta: ViewerMeta | null; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <ViewerStyles />
      {meta && <ViewerTopBar meta={meta} actions={actions} />}
      <main id="main" className="pdfv-stage relative min-h-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

const tones = {
  primary: "bg-primary-soft text-primary ring-primary/20",
  accent: "bg-accent-soft text-warning ring-accent/30",
  danger: "bg-danger-soft text-danger ring-danger/20",
  neutral: "bg-muted text-muted-foreground ring-border-strong",
} as const;

/** Centered state card on the reading stage, with a faint stack of blank sheets behind it. */
export function ViewerStateCard({
  icon,
  title,
  description,
  action,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        <div aria-hidden className="pdfv-page absolute inset-x-10 -top-5 bottom-8 -rotate-3 rounded-md opacity-60" />
        <div aria-hidden className="pdfv-page absolute inset-x-6 -top-2.5 bottom-4 rotate-2 rounded-md opacity-80" />
        <div className="pdfv-glass relative rounded-2xl px-6 py-8 text-center sm:px-8">
          <div className={cn("mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl ring-1 ring-inset [&_svg]:size-6", tones[tone])}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
          {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

/** Placeholder sheet with shimmering text lines. Size it with width + aspect ratio. */
export function PageSkeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("pdfv-page relative overflow-hidden rounded-[3px]", className)} style={style} aria-hidden>
      <div className="absolute inset-0 px-[9%] pt-[9%]">
        <div className="h-[2.2%] w-2/5 rounded-full bg-slate-200" />
        <div className="mt-[5%] space-y-[2.6%]">
          {[92, 100, 96, 84, 98, 70].map((w, i) => (
            <div key={i} className="h-[1.3%] min-h-1 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="mt-[7%] h-[18%] rounded-md bg-slate-100/80" />
        <div className="mt-[7%] space-y-[2.6%]">
          {[100, 94, 88, 60].map((w, i) => (
            <div key={i} className="h-[1.3%] min-h-1 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="shimmer absolute inset-0" />
    </div>
  );
}
