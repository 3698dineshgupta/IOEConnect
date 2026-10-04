import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgramSceneLazy } from "@/components/scene";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { plural } from "./page-parts";

export interface ProgramCardData {
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  years: number;
  semesters: number;
  subjects: number;
}

/**
 * Large always-navy program card (same look in both themes) with the lazy 3D program scene,
 * a faint grid, glow blobs and a slow light streak. All numbers come from the curriculum tree.
 */
export function ProgramCard({ program, priority = false }: { program: ProgramCardData; priority?: boolean }) {
  const counts = [
    program.years > 0 ? plural(program.years, "Year") : null,
    program.semesters > 0 ? plural(program.semesters, "Semester") : null,
  ].filter(Boolean);

  return (
    <article className="bg-gradient-navy ring-gradient group relative isolate overflow-hidden rounded-[2rem] border border-white/10 text-white shadow-xl">
      <style>{`
        @keyframes res-streak { 0% { transform: translateX(-140%) skewX(-18deg) } 60%, 100% { transform: translateX(640%) skewX(-18deg) } }
        .res-streak { animation: res-streak 9s var(--ease-in-out) infinite; }
        @media (prefers-reduced-motion: reduce) { .res-streak { animation: none; opacity: 0 } }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_80%_80%_at_70%_40%,#000_20%,transparent_80%)]" style={{ ["--grid-line" as string]: "rgba(148,163,184,0.10)" }} />
        <div className="glow-blob glow-blob-drift -right-24 -top-10 size-[28rem] max-w-[90vw]" />
        <div className="glow-blob glow-blob-cyan -bottom-32 left-0 size-80 opacity-60" />
        <div className="res-streak absolute inset-y-0 left-0 w-1/6 bg-linear-to-r from-transparent via-white/[0.07] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
      </div>

      <div className="grid items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative p-7 sm:p-10 lg:p-14">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-bright">
            <span aria-hidden className="size-1.5 rounded-full bg-cyan-bright shadow-[0_0_10px_var(--cyan-bright)]" />
            {program.name}
          </p>
          <h3 className="mt-5 text-7xl font-extrabold leading-[0.9] tracking-[-0.06em] sm:text-8xl">
            {program.shortName || program.name}
          </h3>
          {counts.length > 0 && (
            <p className="mt-6 text-lg font-semibold text-white/90 sm:text-xl">{counts.join(" • ")}</p>
          )}
          <p className="mt-2 max-w-sm text-white/60">{program.description || "Explore the complete academic journey"}</p>
          {program.subjects > 0 && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
              <span className="font-mono text-white">{program.subjects}</span> {program.subjects === 1 ? "subject" : "subjects"} listed
            </p>
          )}
          <div className="mt-8">
            <Link
              href={`/resources/${program.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              aria-label={`Explore ${program.name}`}
            >
              Explore Program <ArrowRight aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
        <div className="relative h-64 sm:h-96 lg:h-[30rem]">
          <ProgramSceneLazy forceFallback={!priority} />
        </div>
      </div>
    </article>
  );
}
