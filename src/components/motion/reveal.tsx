"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "./hooks";
import { easings } from "./presets";

const tags = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
  span: motion.span,
  p: motion.p,
  h2: motion.h2,
} as const;

export type RevealTag = keyof typeof tags;

export interface RevealProps {
  children?: React.ReactNode;
  className?: string;
  /** Element to render. Default "div". */
  as?: RevealTag;
  /** Seconds before the animation starts. */
  delay?: number;
  /** Seconds. Default 0.7. */
  duration?: number;
  /** Start offset in px (slides up by default). */
  y?: number;
  x?: number;
  /** Start blurred (subtle 6px blur). */
  blur?: boolean;
  /** Animate only the first time it enters (default true). */
  once?: boolean;
  /** Fraction of the element visible before triggering. Default 0.2. */
  amount?: number;
  id?: string;
  style?: React.CSSProperties;
}

/** Fade + slide in when scrolled into view. Reduced motion → plain fade. */
export function Reveal({
  children,
  className,
  as = "div",
  delay = 0,
  duration = 0.7,
  y = 18,
  x = 0,
  blur = false,
  once = true,
  amount = 0.2,
  id,
  style,
}: RevealProps) {
  const reduce = useReducedMotion();
  const Tag = tags[as] as typeof motion.div;
  return (
    <Tag
      id={id}
      style={style}
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y, x: reduce ? 0 : x, filter: blur && !reduce ? "blur(6px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
      viewport={{ once, amount }}
      transition={{ duration: reduce ? 0.3 : duration, delay, ease: easings.outExpo }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ Stagger */

export interface StaggerProps extends Omit<RevealProps, "y" | "x" | "blur" | "duration"> {
  /** Seconds between children. Default 0.08. */
  stagger?: number;
}

const StaggerCtx = React.createContext(false);

/** Parent that reveals its `StaggerItem` children one after another when in view. */
export function Stagger({ children, className, as = "div", delay = 0, stagger = 0.08, once = true, amount = 0.15, id, style }: StaggerProps) {
  const reduce = useReducedMotion();
  const Tag = tags[as] as typeof motion.div;
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } },
  };
  return (
    <StaggerCtx.Provider value={reduce}>
      <Tag id={id} style={style} className={className} variants={variants} initial="hidden" whileInView="show" viewport={{ once, amount }}>
        {children}
      </Tag>
    </StaggerCtx.Provider>
  );
}

export interface StaggerItemProps {
  children?: React.ReactNode;
  className?: string;
  as?: RevealTag;
  /** Start offset in px. Default 16. */
  y?: number;
  /** Seconds. Default 0.6. */
  duration?: number;
  id?: string;
  style?: React.CSSProperties;
}

/** Child of `Stagger`. Must be a direct or nested descendant of a Stagger (inherits variants). */
export function StaggerItem({ children, className, as = "div", y = 16, duration = 0.6, id, style }: StaggerItemProps) {
  const reduce = React.useContext(StaggerCtx);
  const Tag = tags[as] as typeof motion.div;
  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.3 : duration, ease: easings.outExpo } },
  };
  return (
    <Tag id={id} style={style} className={className} variants={variants}>
      {children}
    </Tag>
  );
}
