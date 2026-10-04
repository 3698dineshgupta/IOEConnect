"use client";

import * as React from "react";
import { animate } from "motion/react";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "./hooks";
import { easings } from "./presets";

export interface CountUpProps {
  /** Final number (pass real data only). */
  value: number;
  /** Seconds. Default 1.4. */
  duration?: number;
  /** Start value. Default 0. */
  from?: number;
  /** Intl locale. Default "en-US" (fixed so server and client match). */
  locale?: string;
  /** Intl.NumberFormat options, e.g. { maximumFractionDigits: 1 }. */
  format?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Counts from `from` to `value` when scrolled into view.
 * SSR renders the final value (correct without JS); screen readers always get the final value.
 */
export function CountUp({ value, duration = 1.4, from = 0, locale = "en-US", format, prefix = "", suffix = "", className }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduce = useReducedMotion();
  const formatKey = JSON.stringify(format ?? {});
  const fmt = React.useMemo(() => new Intl.NumberFormat(locale, JSON.parse(formatKey) as Intl.NumberFormatOptions), [locale, formatKey]);
  const final = `${prefix}${fmt.format(value)}${suffix}`;
  const started = React.useRef(false);

  // Before it enters the viewport, show the start value (only after mount, so SSR shows final).
  React.useLayoutEffect(() => {
    if (reduce || started.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.top > window.innerHeight) ref.current.textContent = `${prefix}${fmt.format(from)}${suffix}`;
  }, [reduce, fmt, from, prefix, suffix]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !inView || started.current) return;
    started.current = true;
    if (reduce) {
      el.textContent = final;
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: easings.outExpo,
      onUpdate: (v) => {
        const rounded = Number.isInteger(value) ? Math.round(v) : v;
        el.textContent = `${prefix}${fmt.format(rounded)}${suffix}`;
      },
      onComplete: () => {
        el.textContent = final;
      },
    });
    return () => {
      controls.stop();
      el.textContent = final;
    };
  }, [inView, reduce, from, value, duration, fmt, prefix, suffix, final]);

  return (
    <span className={cn("tabular-nums", className)}>
      <span ref={ref} aria-hidden>
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
