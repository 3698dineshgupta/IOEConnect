"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hit {
  key: string;
  kind: "subject" | "resource";
  title: string;
  label: string;
  href: string;
  premium: boolean;
}

/** Debounced catalog search with an accessible combobox/listbox. Header-ready: set className for width. */
export function SearchBar({
  className,
  placeholder = "Search subjects, notes and PYQs",
  initialQuery = "",
  autoFocus = false,
}: {
  className?: string;
  placeholder?: string;
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/resources/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.status === 429) {
          setHits([]);
          setMessage("Too many searches. Try again in a minute.");
        } else if (!res.ok) {
          setHits([]);
          setMessage("Search is unavailable right now.");
        } else {
          const json = (await res.json()) as { results: Hit[] };
          setHits(json.results);
          setMessage(json.results.length === 0 ? `No results for "${term}".` : "");
        }
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setMessage("Search is unavailable right now.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (hits.length ? (i + 1) % hits.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (hits.length ? (i <= 0 ? hits.length - 1 : i - 1) : -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && hits[active]) go(hits[active].href);
      else if (q.trim().length >= 2) go(`/resources?q=${encodeURIComponent(q.trim())}`);
    }
  }

  const showPanel = open && q.trim().length >= 2 && (hits.length > 0 || message);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <div role="search">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search resources
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={!!showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring"
        />
        {loading && <Loader2 aria-hidden className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {showPanel ? (hits.length ? `${hits.length} results` : message) : ""}
      </span>
      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-auto rounded-md border border-border bg-card p-1 shadow-lg"
        >
          {hits.length === 0 ? (
            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
              {message}
            </li>
          ) : (
            hits.map((h, i) => (
              <li
                key={h.key}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(h.href);
                }}
                className={cn("cursor-pointer rounded px-3 py-2", i === active ? "bg-primary-soft" : "hover:bg-muted")}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="line-clamp-2 break-words">{h.title}</span>
                  {h.premium && <Crown className="size-3 shrink-0 text-accent" aria-label="Premium" />}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{h.label}</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
