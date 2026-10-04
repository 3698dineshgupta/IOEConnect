import * as React from "react";
import { Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

/** Consistent page header: eyebrow, large tight heading, description, optional actions. Server-safe. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  as: Heading = "h1",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal as="header" y={12} duration={0.5} className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <Heading className="text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-4xl">{title}</Heading>
        {description && <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </Reveal>
  );
}

/** Decorative layered backdrop for a page section (grid + glow). Place inside a `relative` container. */
export function PageBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden", className)}>
      <div className="bg-grid bg-grid-fade absolute inset-0" />
      <div className="glow-blob -top-24 left-1/2 size-[420px] -translate-x-1/2" />
    </div>
  );
}
