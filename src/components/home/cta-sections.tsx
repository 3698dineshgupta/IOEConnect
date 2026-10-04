import Link from "next/link";
import { ArrowRight, Calculator, Crown, Download, Sparkles, Upload, Wand2 } from "lucide-react";
import { MagneticButton, Reveal } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionHead } from "./section-head";

/** SCGPA teaser: structure-only preview (no invented marks, credits or results). */
export function ScgpaTeaser() {
  const rows = [78, 64, 88, 56];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className="lg:order-2">
        <SectionHead
          eyebrow="SCGPA calculator"
          title="Know your score before results."
          text="Pick your semester and the subjects fill in automatically. Enter your grades, see your SCGPA instantly, then download a clean gradesheet."
        />
        <ul className="mt-6 space-y-3 text-sm text-foreground/85 sm:text-base">
          {[
            [Wand2, "Subjects auto-filled for your semester"],
            [Calculator, "Instant SCGPA as you change grades"],
            [Download, "Downloadable gradesheet of your own result"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Wand2;
            return (
              <li key={label as string} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary ring-1 ring-primary/20">
                  <I className="size-4" aria-hidden />
                </span>
                {label as string}
              </li>
            );
          })}
        </ul>
        <Link href="/calculator" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
          Open calculator <ArrowRight aria-hidden />
        </Link>
      </Reveal>

      <Reveal delay={0.1} className="relative lg:order-1">
        <div aria-hidden className="glow-blob -inset-2 opacity-40 sm:-inset-8" />
        <div aria-hidden className="ring-gradient relative rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="size-4 text-primary" /> Semester gradesheet
            </span>
            <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-bold tracking-wide text-primary">SCGPA</span>
          </div>
          <div className="mt-5 space-y-3">
            {rows.map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 flex-1 rounded-lg border border-border bg-muted/60 px-3">
                  <div className="mt-3.5 h-2 rounded-full bg-border-strong" style={{ width: `${w}%` }} />
                </div>
                <div className="grid h-9 w-14 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary">
                  <span className="h-2 w-5 rounded-full bg-primary/50" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-navy px-4 py-3 text-white">
            <span className="text-sm text-white/70">Your SCGPA</span>
            <Sparkles className="size-4 text-cyan-bright" />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/** Premium teaser. No prices: those live on /premium (read from the database there). */
export function PremiumTeaser() {
  return (
    <Reveal className="bg-gradient-navy ring-gradient relative isolate overflow-hidden rounded-3xl border border-white/10 p-8 text-white shadow-xl sm:p-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-30" style={{ ["--grid-line" as string]: "rgba(148,163,184,0.10)" }} />
        <div className="glow-blob -right-24 -top-24 size-96 max-w-[80vw]" />
        <div className="absolute -bottom-24 left-1/4 size-72 rounded-full bg-warning/15 blur-3xl" />
      </div>
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-warning">
            <Crown className="size-4" aria-hidden /> PREMIUM
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">Unlock the full library.</h2>
          <p className="mt-3 text-white/70">
            Premium resources, distraction-free reading and priority requests. Activated after a quick payment review.
          </p>
        </div>
        <MagneticButton>
          <Link href="/premium" className={cn(buttonVariants({ variant: "accent", size: "lg" }), "shrink-0")}>
            See plans <ArrowRight aria-hidden />
          </Link>
        </MagneticButton>
      </div>
    </Reveal>
  );
}

export function ContributeCta() {
  return (
    <Reveal className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 shadow-md sm:p-10 md:grid-cols-[1fr_auto]">
      <div>
        <p className="eyebrow">Community</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Got good notes? Share them.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Students keep this library growing. Upload your notes or papers; after a quick review they are published for
          everyone. Missing something? Request it and we will look for it.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
        <Link href="/my-uploads" className={buttonVariants({ size: "lg" })}>
          <Upload aria-hidden /> Upload notes
        </Link>
        <Link href="/my-requests" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Request a resource
        </Link>
      </div>
    </Reveal>
  );
}

export function FinalCta({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <Reveal className="relative isolate overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-lg sm:py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid bg-grid-fade absolute inset-0 opacity-60" />
        <div className="glow-blob left-1/2 top-0 size-120 max-w-[90vw] -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">
        Start studying <span className="text-gradient">smarter</span> today.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-muted-foreground sm:text-lg">
        Open your program, pick your semester and find everything for each subject in one place.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <MagneticButton>
          <Link href="/resources" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Explore Resources <ArrowRight aria-hidden />
          </Link>
        </MagneticButton>
        {!signedIn && (
          <Link href="/register" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}>
            Create free account
          </Link>
        )}
      </div>
    </Reveal>
  );
}
