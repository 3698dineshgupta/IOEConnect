import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgramSceneLazy } from "@/components/scene";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Dark-navy program card. Always navy (both themes) so the 3D scene reads the same. */
export function ProgramShowcase() {
  return (
    <div className="bg-gradient-navy ring-gradient relative isolate overflow-hidden rounded-3xl border border-white/10 text-white shadow-xl">
      <style>{`
        @keyframes home-streak { from { transform: translateX(-120%) skewX(-18deg) } to { transform: translateX(520%) skewX(-18deg) } }
        .home-streak { animation: home-streak 7s var(--ease-in-out) infinite; }
        @media (prefers-reduced-motion: reduce) { .home-streak { animation: none; opacity: 0 } }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-40" style={{ ["--grid-line" as string]: "rgba(148,163,184,0.10)" }} />
        <div className="glow-blob -right-20 top-0 size-96 max-w-[80vw]" />
        <div className="glow-blob glow-blob-cyan -bottom-24 left-10 size-72 opacity-50" />
        <div className="home-streak absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="grid items-center lg:grid-cols-[0.95fr_1.05fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <p className="text-xs font-semibold tracking-[0.14em] text-cyan-bright">COMPUTER ENGINEERING</p>
          <h3 className="mt-4 text-6xl font-extrabold leading-none tracking-[-0.05em] sm:text-7xl">CSE</h3>
          <p className="mt-4 text-lg font-medium text-white/85">4 Years • 8 Semesters</p>
          <p className="mt-2 max-w-sm text-white/65">Explore the complete academic journey</p>
          <Link
            href="/resources/cse"
            className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full sm:w-auto")}
          >
            Explore Program <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="relative h-72 sm:h-96 lg:h-[26rem]">
          <ProgramSceneLazy />
        </div>
      </div>
    </div>
  );
}
