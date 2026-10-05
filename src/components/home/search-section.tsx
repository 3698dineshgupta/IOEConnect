"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { openSearchPalette, useModKey, popularSearches } from "@/components/layout";
import { Kbd } from "@/components/ui/kbd";

/** Big search entry that opens the site-wide palette (it owns results, keyboard nav and a11y). */
export function SearchSection() {
  const mod = useModKey();
  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => openSearchPalette()}
        aria-haspopup="dialog"
        className="group flex h-16 w-full items-center gap-4 rounded-2xl border border-border-strong bg-card px-5 text-left shadow-md transition-[box-shadow,border-color,transform] duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:border-primary sm:h-[4.5rem] sm:px-6"
      >
        <Search className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:scale-110" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground min-[400px]:text-base sm:text-lg">Search subjects, notes, PYQs…</span>
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex" aria-hidden>
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
        <span className="sr-only">Opens search. Shortcut: {mod} plus K.</span>
      </button>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-sm text-muted-foreground">Popular</span>
        {popularSearches.map((q) => (
          <Link
            key={q}
            href={`/resources?q=${encodeURIComponent(q)}`}
            onClick={(e) => {
              e.preventDefault();
              openSearchPalette(q);
            }}
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-sm font-medium text-foreground/85 transition-colors duration-150 hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
