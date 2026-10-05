"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { openSearchPalette, popularSearches, useModKey } from "@/components/layout";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

/**
 * Premium search entry for the browse pages. Opens the site-wide ⌘K palette (it owns results,
 * keyboard navigation and a11y; data comes from the /resources/search route handler).
 * Popular chips are real links to /resources?q=… so they also work without JavaScript.
 */
export function ResourceSearch({ initialQuery = "", className }: { initialQuery?: string; className?: string }) {
  const mod = useModKey();
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden className="pointer-events-none absolute -inset-x-2 -inset-y-4 -z-10 sm:-inset-x-6 rounded-[2rem] bg-[radial-gradient(60%_80%_at_50%_50%,var(--glow)_0%,transparent_70%)] opacity-70" />
      <button
        type="button"
        onClick={() => openSearchPalette(initialQuery || undefined)}
        aria-haspopup="dialog"
        className="group relative flex h-16 w-full items-center gap-4 overflow-hidden rounded-2xl border border-border-strong bg-card/95 px-5 text-left shadow-[0_1px_0_var(--hairline),0_18px_48px_-24px_var(--glow-strong)] backdrop-blur transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_0_4px_var(--glow),0_24px_56px_-24px_var(--glow-strong)] focus-visible:border-primary sm:h-[4.5rem] sm:px-6"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-inset ring-primary/15 transition-transform duration-200 group-hover:scale-105">
          <Search className="size-[1.05rem]" aria-hidden />
        </span>
        <span className={cn("min-w-0 flex-1 truncate text-sm min-[400px]:text-base sm:text-lg", initialQuery ? "text-foreground" : "text-muted-foreground")}>
          {initialQuery || "Search subjects, notes, PYQs…"}
        </span>
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex" aria-hidden>
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
        <span className="sr-only">Opens search. Shortcut: {mod} plus K.</span>
      </button>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Popular</span>
        {popularSearches.map((q) => (
          <Link
            key={q}
            href={`/resources?q=${encodeURIComponent(q)}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              openSearchPalette(q);
            }}
            className="group/chip inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-sm font-medium text-foreground/85 transition-[border-color,background-color,color] duration-150 hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
          >
            {q}
            <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-[opacity,transform] duration-150 group-hover/chip:translate-x-0 group-hover/chip:opacity-100" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
