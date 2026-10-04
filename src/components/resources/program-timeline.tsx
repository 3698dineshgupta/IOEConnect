"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "@/components/motion/hooks";
import { toRoman } from "./format";
import { semesterSectionId, yearSectionId } from "./section-ids";

export interface TimelineYear {
  number: number;
  subjectCount: number;
  semesters: Array<{ number: number; subjectCount: number }>;
}

/**
 * Academic timeline: YEAR 1..N as dots on a line (horizontal md+, vertical on mobile) with the
 * semesters beneath. The track draws in when scrolled into view, then the bright fill follows the
 * year section currently on screen. Hovering a year illuminates it; clicking smooth-scrolls.
 */
export function ProgramTimeline({ years }: { years: TimelineYear[] }) {
  const listRef = React.useRef<HTMLOListElement>(null);
  const dotRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const seen = useInView(listRef, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [fill, setFill] = React.useState<{ horizontal: boolean; px: number }>({ horizontal: true, px: 0 });
  const drawn = seen || reduce;

  // Follow the year section in view.
  React.useEffect(() => {
    const els = years.map((y) => document.getElementById(yearSectionId(y.number))).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = -1;
        let bestRatio = 0;
        els.forEach((el, i) => {
          const r = ratios.get(el.id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = i;
          }
        });
        if (best >= 0) setActive(best);
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [years]);

  // Measure the active dot so the progress fill ends exactly on it (both orientations).
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const dot = dotRefs.current[active];
      if (!dot) return;
      const o = list.getBoundingClientRect();
      const d = dot.getBoundingClientRect();
      const horizontal = window.matchMedia("(min-width: 768px)").matches;
      const px = horizontal ? d.left + d.width / 2 - o.left - 9 : d.top + d.height / 2 - o.top - 12;
      setFill({ horizontal, px: Math.max(0, px) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active, years.length]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    el.querySelector<HTMLElement>("[data-section-heading]")?.focus({ preventScroll: true });
  };

  if (years.length === 0) return null;
  const fillPx = drawn ? fill.px : 0;

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]" />
      <div aria-hidden className="glow-blob -left-24 -top-24 -z-10 size-72 opacity-50" />
      <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Academic timeline</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] sm:text-[1.75rem]">Your path through the program</h2>
        </div>
        <p className="text-sm text-muted-foreground">Pick a semester to jump to its subjects.</p>
      </div>

      <ol
        ref={listRef}
        className="relative grid gap-9 pl-10 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))] md:gap-6 md:pl-0 md:pt-12"
        style={{ ["--cols" as string]: years.length }}
      >
        {/* base track */}
        <span aria-hidden className="absolute bottom-3 left-[9px] top-3 w-px bg-border-strong md:bottom-auto md:left-[9px] md:right-0 md:top-[9px] md:h-px md:w-auto" />
        {/* drawn-in gradient line */}
        <span
          aria-hidden
          className={cn(
            "absolute bottom-3 left-[9px] top-3 w-px origin-top bg-linear-to-b from-primary/50 via-cyan-bright/40 to-transparent transition-transform duration-[1600ms] ease-[var(--ease-out-expo)] motion-reduce:transition-none",
            "md:bottom-auto md:left-[9px] md:right-0 md:top-[9px] md:h-px md:w-auto md:origin-left md:bg-linear-to-r",
            drawn ? "scale-100" : "scale-y-0 md:scale-x-0 md:scale-y-100",
          )}
        />
        {/* active progress, ends on the active year's dot */}
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-gradient-brand shadow-[0_0_14px_var(--glow-strong)] transition-[width,height] duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none"
          style={fill.horizontal ? { left: 9, top: 8, height: 3, width: fillPx } : { left: 8, top: 12, width: 3, height: fillPx }}
        />

        {years.map((y, i) => {
          const passed = drawn && i <= active;
          const current = drawn && i === active;
          return (
            <li key={y.number} className="group relative">
              <span
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                aria-hidden
                className={cn(
                  "absolute -left-10 top-0.5 flex size-[19px] items-center justify-center rounded-full border-2 bg-card transition-[border-color,box-shadow,transform] duration-300 md:-top-12 md:left-0",
                  passed ? "border-primary" : "border-border-strong",
                  current && "shadow-[0_0_0_6px_var(--glow)]",
                  "group-hover:scale-110 group-hover:border-primary group-hover:shadow-[0_0_0_7px_var(--glow),0_0_24px_var(--glow-strong)]",
                )}
              >
                <span className={cn("size-[7px] rounded-full transition-colors duration-300 group-hover:bg-primary", passed ? "bg-primary" : "bg-transparent")} />
              </span>
              <a
                href={`#${yearSectionId(y.number)}`}
                onClick={(e) => go(e, yearSectionId(y.number))}
                aria-current={current ? "step" : undefined}
                className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "block font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors group-hover:text-primary",
                    passed ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  Year {String(y.number).padStart(2, "0")}
                </span>
                <span className="mt-1 block text-xl font-extrabold tracking-[-0.03em] transition-colors group-hover:text-primary">Year {toRoman(y.number)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {y.subjectCount} subject{y.subjectCount === 1 ? "" : "s"}
                </span>
              </a>
              {y.semesters.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-1">
                  {y.semesters.map((s) => (
                    <li key={s.number}>
                      <a
                        href={`#${semesterSectionId(s.number)}`}
                        onClick={(e) => go(e, semesterSectionId(s.number))}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm font-semibold transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft hover:text-primary hover:shadow-[0_10px_24px_-14px_var(--glow-strong)] group-hover:border-primary/25"
                      >
                        <span>Semester {toRoman(s.number)}</span>
                        <span className="font-mono text-[11px] font-medium text-muted-foreground" aria-label={`${s.subjectCount} subjects`}>
                          {s.subjectCount}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
