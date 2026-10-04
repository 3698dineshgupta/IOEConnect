"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "@/components/motion/hooks";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const YEARS = [1, 2, 3, 4].map((y) => ({
  year: y,
  semesters: [y * 2 - 1, y * 2].map((s) => ({ n: s, label: ROMAN[s - 1] })),
}));

/** YEAR 1-4 on a line (horizontal md+, vertical on mobile) with semester links; progress line draws in on view. */
export function AcademicTimeline({ program = "cse" }: { program?: string }) {
  const ref = React.useRef<HTMLOListElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.25 });
  const reduce = useReducedMotion();
  const grown = seen || reduce;

  return (
    <ol ref={ref} className="relative grid gap-8 pl-8 md:grid-cols-4 md:gap-6 md:pl-0 md:pt-10">
      {/* track + animated progress */}
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-border-strong md:bottom-auto md:left-0 md:right-0 md:top-[7px] md:h-px md:w-auto" />
      <span
        aria-hidden
        className={cn(
          "absolute bottom-2 left-[7px] top-2 w-0.5 origin-top bg-gradient-brand shadow-[0_0_12px_var(--glow-strong)] transition-transform duration-[1800ms] ease-[var(--ease-out-expo)] motion-reduce:transition-none",
          "md:bottom-auto md:left-0 md:right-0 md:top-[6px] md:h-0.5 md:w-auto md:origin-left",
          grown ? "scale-100" : "scale-y-0 md:scale-x-0 md:scale-y-100",
        )}
      />

      {YEARS.map(({ year, semesters }) => (
        <li key={year} className="group relative">
          <span
            aria-hidden
            className="absolute -left-8 top-1 size-[15px] rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color,transform] duration-300 group-hover:scale-125 group-hover:bg-primary group-hover:shadow-[0_0_0_6px_var(--glow),0_0_24px_var(--glow-strong)] md:-top-10 md:left-0"
          />
          <Link
            href={`/resources/${program}/year-${year}`}
            className="inline-flex min-h-10 items-center text-lg font-extrabold tracking-[-0.02em] transition-colors group-hover:text-primary md:min-h-0"
          >
            Year {year}
          </Link>
          <ul className="mt-3 flex flex-col gap-2">
            {semesters.map((s) => (
              <li key={s.n}>
                <Link
                  href={`/resources/${program}/year-${year}/semester-${s.n}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3 text-sm font-medium transition-[border-color,box-shadow,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft hover:shadow-[0_8px_24px_-12px_var(--glow-strong)]"
                >
                  <span>Semester {s.label}</span>
                  <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
