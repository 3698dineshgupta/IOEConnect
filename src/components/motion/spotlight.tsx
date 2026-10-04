"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Glow radius in px. Default 340. */
  size?: number;
  /** Glow colour (any CSS colour). Default var(--glow). */
  color?: string;
  /** Also light up the 1px border near the pointer. Default true. */
  border?: boolean;
  /** Border highlight colour. Default primary/cyan mix. */
  borderColor?: string;
}

/**
 * Container with a soft glow (and border highlight) that follows the pointer.
 * Zero React re-renders: updates CSS variables directly. Invisible on touch (no hover).
 * Give it rounding + border yourself, e.g. className="rounded-2xl border border-border bg-card".
 */
export function Spotlight({
  children,
  className,
  size = 340,
  color = "var(--glow)",
  border = true,
  borderColor = "color-mix(in srgb, var(--cyan-bright) 55%, var(--primary))",
  style,
  onPointerMove,
  ...rest
}: SpotlightProps) {
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      className={cn("group/spot relative isolate", className)}
      style={{ "--spot-size": `${size}px`, "--spot-color": color, "--spot-border": borderColor, ...style } as React.CSSProperties}
      onPointerMove={handleMove}
      {...rest}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: "radial-gradient(var(--spot-size) circle at var(--spot-x, 50%) var(--spot-y, 50%), var(--spot-color), transparent 70%)" }}
      />
      {border && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
          style={{
            padding: 1,
            background: "radial-gradient(calc(var(--spot-size) * 0.7) circle at var(--spot-x, 50%) var(--spot-y, 50%), var(--spot-border), transparent 70%)",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}
      {children}
    </div>
  );
}
