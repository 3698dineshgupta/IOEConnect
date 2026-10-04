import Link from "next/link";
import { ArrowRight, FileClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CountUp, Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";
import { SectionHead } from "./section-head";
import type { HomeStats } from "./data";

/** Conceptual labels only: no exam years or numbers are invented. */
const YEAR_LABELS = ["Latest", "Previous", "Earlier", "Older"];

export function PyqSection() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <SectionHead
          eyebrow="Past questions"
          title="One PDF, every year."
          text="Each PYQ file can cover several exam years. Pick a year and the viewer can open at the right page, so you practise with real papers instead of scrolling for them."
        />
        <Link href="/resources?type=PYQ" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "mt-8")}>
          Browse PYQs <ArrowRight aria-hidden />
        </Link>
      </div>

      <figure aria-label="How a PYQ file is organised" className="relative">
        <div aria-hidden className="glow-blob -inset-2 opacity-50 sm:-inset-6" />
        <div className="ring-gradient relative rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FileClock className="size-4 text-primary" aria-hidden /> Subject PYQ
            </span>
            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-bold tracking-wide text-warning">PDF</span>
          </div>

          {/* year timeline */}
          <div className="relative mt-6">
            <span aria-hidden className="absolute left-3 right-3 top-[7px] h-px bg-border-strong" />
            <ol className="relative grid grid-cols-5 gap-2">
              {[...YEAR_LABELS, "More"].map((l, i) => (
                <li key={l} className="flex flex-col items-center gap-2 text-center">
                  <span
                    aria-hidden
                    className={cn("size-[15px] rounded-full border-2 bg-card", i === 0 ? "border-primary bg-primary shadow-[0_0_0_5px_var(--glow)]" : "border-border-strong")}
                  />
                  <span className={cn("w-full rounded-lg border px-1 py-2 text-[0.6875rem] font-medium sm:text-xs", i === 0 ? "border-primary/50 bg-primary-soft text-primary" : "border-border bg-muted text-muted-foreground")}>
                    {l}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 space-y-2.5" aria-hidden>
            {[88, 100, 72, 94, 60].map((w, i) => (
              <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">
          Illustration. The years inside each real file are listed on its subject page.
        </figcaption>
      </figure>
    </div>
  );
}

const bars = [
  { key: "syllabus", label: "Syllabus" },
  { key: "notes", label: "Notes" },
  { key: "pyq", label: "PYQs" },
] as const;

/** Real coverage only. Renders nothing when there is no data. */
export function CoverageWidget({ stats }: { stats: HomeStats }) {
  const total = stats.subjects;
  const any = stats.coverage.syllabus + stats.coverage.notes + stats.coverage.pyq;
  if (total <= 0 || any <= 0) return null;

  return (
    <Reveal className="mt-14 rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-xl font-extrabold tracking-[-0.02em]">Your CSE journey, covered</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Subjects in the library that have each resource published, out of{" "}
            <CountUp value={total} className="font-mono font-semibold text-foreground" /> subjects.
          </p>
        </div>
      </div>
      <ul className="mt-6 grid gap-5 sm:grid-cols-3">
        {bars.map(({ key, label }) => {
          const n = stats.coverage[key];
          const pct = Math.round((n / total) * 100);
          return (
            <li key={key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold">{label}</span>
                <span className="font-mono text-muted-foreground">
                  {n} of {total}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${label} coverage`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{pct}% of subjects</p>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
