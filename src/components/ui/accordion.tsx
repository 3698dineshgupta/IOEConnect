"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type RootCtx = {
  isOpen: (v: string) => boolean;
  toggle: (v: string) => void;
  baseId: string;
  headingLevel: 2 | 3 | 4;
};
const AccordionCtx = React.createContext<RootCtx | null>(null);
const ItemCtx = React.createContext<{ value: string; open: boolean; disabled?: boolean } | null>(null);

function useRoot() {
  const c = React.useContext(AccordionCtx);
  if (!c) throw new Error("Accordion parts must be inside <Accordion>");
  return c;
}
function useItem() {
  const c = React.useContext(ItemCtx);
  if (!c) throw new Error("AccordionTrigger/AccordionContent must be inside <AccordionItem>");
  return c;
}

export interface AccordionItemData {
  value: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  /** "single" (default): one open at a time. "multiple": independent items. */
  type?: "single" | "multiple";
  /** Controlled open value(s). string for single ("" = none), string[] for multiple. */
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** single only: allow closing the open item (default true). */
  collapsible?: boolean;
  /** Shorthand: render items without composing parts. */
  items?: AccordionItemData[];
  /** Heading level wrapping each trigger. Default 3. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
  children?: React.ReactNode;
}

const toArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/**
 * Accessible accordion (WAI-ARIA pattern: heading > button[aria-expanded] + region) with spring
 * height animation. Closed panels stay in the DOM (inert) so content remains crawlable.
 * Arrow Up/Down, Home, End move between triggers.
 */
export function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  collapsible = true,
  items,
  headingLevel = 3,
  className,
  children,
}: AccordionProps) {
  const [inner, setInner] = React.useState<string[]>(toArray(defaultValue));
  const open = value !== undefined ? toArray(value) : inner;
  const baseId = React.useId();

  const toggle = (v: string) => {
    let next: string[];
    if (type === "multiple") next = open.includes(v) ? open.filter((x) => x !== v) : [...open, v];
    else next = open.includes(v) ? (collapsible ? [] : open) : [v];
    if (value === undefined) setInner(next);
    onValueChange?.(type === "multiple" ? next : (next[0] ?? ""));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.matches("[data-accordion-trigger]")) return;
    const triggers = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]:not(:disabled)"));
    const i = triggers.indexOf(target as HTMLButtonElement);
    let n = -1;
    if (e.key === "ArrowDown") n = (i + 1) % triggers.length;
    else if (e.key === "ArrowUp") n = (i - 1 + triggers.length) % triggers.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = triggers.length - 1;
    if (n >= 0) {
      e.preventDefault();
      triggers[n]?.focus();
    }
  };

  return (
    <AccordionCtx.Provider value={{ isOpen: (v) => open.includes(v), toggle, baseId, headingLevel }}>
      <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)} onKeyDown={onKeyDown}>
        {items
          ? items.map((it) => (
              <AccordionItem key={it.value} value={it.value} disabled={it.disabled}>
                <AccordionTrigger>{it.title}</AccordionTrigger>
                <AccordionContent>{it.content}</AccordionContent>
              </AccordionItem>
            ))
          : children}
      </div>
    </AccordionCtx.Provider>
  );
}

export function AccordionItem({ value, disabled, className, children }: { value: string; disabled?: boolean; className?: string; children: React.ReactNode }) {
  const { isOpen } = useRoot();
  const open = isOpen(value);
  return (
    <ItemCtx.Provider value={{ value, open, disabled }}>
      <div data-state={open ? "open" : "closed"} className={cn("group/acc", className)}>
        {children}
      </div>
    </ItemCtx.Provider>
  );
}

export function AccordionTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  const { toggle, baseId, headingLevel } = useRoot();
  const { value, open, disabled } = useItem();
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <H className="m-0">
      <button
        type="button"
        data-accordion-trigger
        id={`${baseId}-${value}-trigger`}
        aria-expanded={open}
        aria-controls={`${baseId}-${value}-panel`}
        disabled={disabled}
        onClick={() => toggle(value)}
        className={cn(
          "flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground transition-colors hover:text-primary focus-visible:outline-offset-[-2px] disabled:opacity-50",
          className,
        )}
      >
        <span>{children}</span>
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-[transform,background-color,color] duration-300 ease-[var(--ease-spring)]",
            open && "rotate-180 bg-primary-soft text-primary",
          )}
        >
          <ChevronDown className="size-4" />
        </span>
      </button>
    </H>
  );
}

export function AccordionContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { baseId } = useRoot();
  const { value, open } = useItem();
  return (
    <motion.div
      id={`${baseId}-${value}-panel`}
      role="region"
      aria-labelledby={`${baseId}-${value}-trigger`}
      inert={!open}
      initial={false}
      animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ height: { type: "spring", stiffness: 260, damping: 32, mass: 0.9 }, opacity: { duration: 0.2 } }}
      className="overflow-hidden"
    >
      <div className={cn("px-5 pb-5 text-sm leading-relaxed text-muted-foreground", className)}>{children}</div>
    </motion.div>
  );
}
