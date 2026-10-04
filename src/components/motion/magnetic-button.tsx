"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { useFinePointer, useReducedMotion } from "./hooks";
import { springs } from "./presets";

export interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** Fraction of pointer offset applied (0–1). Default 0.25. */
  strength?: number;
  /** Max travel in px. Default 6. */
  max?: number;
}

/**
 * Wraps any button/link so it drifts a few px toward the pointer, springing back on leave.
 * Inline-block wrapper; static on touch and reduced motion.
 *
 *   <MagneticButton><Link href="/resources" className={buttonVariants()}>Explore</Link></MagneticButton>
 */
export function MagneticButton({ children, className, strength = 0.25, max = 6 }: MagneticButtonProps) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduce;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, springs.snappy);
  const sy = useSpring(y, springs.snappy);

  const clamp = (v: number) => Math.max(-max, Math.min(max, v));
  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
    y.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      className={cn("inline-flex", className)}
      style={enabled ? { x: sx, y: sy } : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onBlur={reset}
    >
      {children}
    </motion.span>
  );
}
