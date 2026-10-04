import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MagneticButton } from "@/components/motion";
import { HeroSceneLazy } from "@/components/scene";
import { cn } from "@/lib/utils";

/**
 * Cinematic hero. The H1 is deliberately NOT wrapped in a delayed Reveal (LCP / hydration opacity).
 * `subjects` is a real DB count (0 hides the chip).
 */
export function Hero({ subjects }: { subjects: number }) {
  const ticks = ["Syllabus", "Notes", "PYQs", "Academic Tools", ...(subjects > 0 ? [`${subjects.toLocaleString("en-US")} Subjects`] : [])];

  return (
    <section className="bg-noise relative overflow-hidden border-b border-border/60">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid bg-grid-fade absolute inset-0 opacity-60" />
        <div className="glow-blob glow-blob-drift -left-24 -top-24 size-120 max-w-[90vw]" />
        <div className="glow-blob glow-blob-cyan -right-16 top-1/3 size-96 max-w-[70vw] opacity-60" />
        <div className="glow-blob glow-blob-violet bottom-0 left-1/3 size-80 max-w-[60vw] opacity-40" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-10 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-16 lg:pt-20">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-primary">
            <span aria-hidden>✦</span> BUILT FOR IOE STUDENTS
          </p>

          <h1 className="mt-6 text-balance text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl xl:text-7xl">
            Everything you need to <span className="text-gradient">master IOE</span>.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Notes, syllabus, past questions, resources, calculators and everything you need — organized in one intelligent
            learning platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MagneticButton>
              <Link href="/resources" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                Explore Resources <ArrowRight aria-hidden />
              </Link>
            </MagneticButton>
            <Link href="/resources/cse" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full sm:w-auto")}>
              Explore CSE <ArrowRight aria-hidden />
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-foreground/85" aria-label="What is included">
            {ticks.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <span aria-hidden className="grid size-5 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/25">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative h-85 sm:h-110 lg:h-140">
          <HeroSceneLazy />
        </div>
      </div>
    </section>
  );
}
