"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useFinePointer, useReducedMotion } from "./hooks";
import { springs } from "./presets";

export interface TiltCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd" | "style"> {
  children?: React.ReactNode;
  /** Max rotation in degrees. Default 7. */
  maxTilt?: number;
  /** Hover scale. Default 1.015. */
  scale?: number;
  /** CSS perspective in px. Default 900. */
  perspective?: number;
  /** Moving light reflection overlay. Default false. */
  glare?: boolean;
  /** Lift shadow on hover. Default true. */
  lift?: boolean;
  /** Class for the inner (rotating) layer. `className` goes on the outer perspective wrapper. */
  innerClassName?: string;
  style?: React.CSSProperties;
}

/**
 * Pointer-driven 3D tilt with spring damping, lifting shadow and optional glare.
 * Automatically static on touch devices and when reduced motion is preferred.
 * Children can use `[transform:translateZ(30px)]` for parallax depth (inner has preserve-3d).
 */
export function TiltCard({
  children,
  className,
  innerClassName,
  maxTilt = 7,
  scale = 1.015,
  perspective = 900,
  glare = false,
  lift = true,
  style,
  ...rest
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduce;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);
  const sx = useSpring(px, springs.soft);
  const sy = useSpring(py, springs.soft);
  const sh = useSpring(hover, springs.soft);

  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);
  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const s = useTransform(sh, [0, 1], [1, scale]);
  const glareX = useTransform(sx, (v) => `${v * 100}%`);
  const glareY = useTransform(sy, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.16), transparent 45%)`;
  const glareOpacity = useTransform(sh, [0, 1], [0, 1]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onEnter = () => enabled && hover.set(1);
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  };

  return (
    <div
      className={cn("group/tilt relative", className)}
      style={{ perspective, ...style }}
      onPointerMove={onPointerMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      {...rest}
    >
      <motion.div
        className={cn(
          "relative h-full rounded-[inherit] [transform-style:preserve-3d] transition-shadow duration-300",
          lift && enabled && "group-hover/tilt:shadow-xl",
          innerClassName,
        )}
        style={enabled ? { rotateX, rotateY, scale: s } : undefined}
      >
        {children}
        {glare && enabled && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
            style={{ background: glareBg, opacity: glareOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}
