"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Calculator, CornerDownLeft, Crown, FileText, Loader2, Search, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { popularSearches } from "./nav-config";

/** Shape returned by GET /resources/search?q= (see src/app/resources/search/route.ts). */
interface Hit {
  key: string;
  kind: "subject" | "resource";
  title: string;
  label: string;
  href: string;
  premium: boolean;
}

type Option =
  | { id: string; type: "hit"; hit: Hit }
  | { id: string; type: "popular"; query: string }
  | { id: string; type: "link"; label: string; sub: string; href: string; icon: "book" | "calc" }
  | { id: string; type: "all"; query: string };

export const OPEN_SEARCH_EVENT = "ioe:open-search";

/** Open the site-wide search palette from anywhere (the header listens for this). */
export function openSearchPalette(query?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: { query } }));
}

const noop = () => () => {};
/** "⌘" on Apple platforms, "Ctrl" elsewhere (and during SSR). */
export function useModKey() {
  return React.useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/**
 * Registers ⌘K / Ctrl+K and the `openSearchPalette()` event; returns [open, setOpen, initialQuery].
 * Use once per page (SiteHeader does).
 */
export function useSearchPaletteState() {
  const [open, setOpen] = React.useState(false);
  const [initial, setInitial] = React.useState("");
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setInitial("");
        setOpen((o) => !o);
      }
    };
    const onEvt = (e: Event) => {
      setInitial((e as CustomEvent<{ query?: string }>).detail?.query ?? "");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onEvt);
    };
  }, []);
  return [open, setOpen, initial] as const;
}

/** Command-palette style search dialog over the existing /resources/search handler. */
export function SearchPalette({ open, onOpenChange, initialQuery = "" }: { open: boolean; onOpenChange: (open: boolean) => void; initialQuery?: string }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Search IOE Connect"
      hideClose
      wrapperClassName="items-start justify-center px-3 pt-[10vh] sm:px-4 sm:pt-[14vh]"
      panelClassName="w-full max-w-xl animate-pop-in overflow-hidden rounded-2xl border border-border ring-1 ring-black/5 dark:ring-white/5"
    >
      {/* keyed so every opening starts fresh */}
      {open && <PaletteBody key={initialQuery} initialQuery={initialQuery} close={() => onOpenChange(false)} />}
    </Modal>
  );
}

function PaletteBody({ initialQuery, close }: { initialQuery: string; close: () => void }) {
  const router = useRouter();
  const listId = React.useId();
  const [q, setQ] = React.useState(initialQuery);
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  const term = q.trim();
  const searching = term.length >= 2;

  React.useEffect(() => {
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
          setMessage("Search is unavailable right now. Try again shortly.");
        } else {
          const json = (await res.json()) as { results: Hit[] };
          setHits(json.results ?? []);
          setMessage(json.results?.length ? "" : `No subjects or resources match "${term}". Try a shorter name or the subject code.`);
        }
        setActive(0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setMessage("Search is unavailable right now. Try again shortly.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  const options: Option[] = React.useMemo(() => {
    if (searching) {
      const o: Option[] = hits.map((hit) => ({ id: `hit-${hit.key}`, type: "hit", hit }));
      o.push({ id: "all", type: "all", query: term });
      return o;
    }
    return [
      ...popularSearches.map((p): Option => ({ id: `pop-${p}`, type: "popular", query: p })),
      { id: "l-res", type: "link", label: "Browse all resources", sub: "Programs, years and semesters", href: "/resources", icon: "book" },
      { id: "l-calc", type: "link", label: "SCGPA Calculator", sub: "Work out your semester GPA", href: "/calculator", icon: "calc" },
    ];
  }, [searching, hits, term]);

  const activeIdx = Math.min(active, Math.max(0, options.length - 1));

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function go(href: string) {
    close();
    router.push(href);
  }
  function choose(o: Option | undefined) {
    if (!o) return;
    if (o.type === "hit") go(o.hit.href);
    else if (o.type === "link") go(o.href);
    else if (o.type === "all") go(`/resources?q=${encodeURIComponent(o.query)}`);
    else {
      setQ(o.query);
      setActive(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = options.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(n ? (activeIdx + 1) % n : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(n ? (activeIdx - 1 + n) % n : 0);
    } else if (e.key === "Home" && !q) {
      setActive(0);
    } else if (e.key === "End" && !q) {
      setActive(n - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[activeIdx]) choose(options[activeIdx]);
      else if (searching) go(`/resources?q=${encodeURIComponent(term)}`);
    }
  }

  const optId = (i: number) => `${listId}-opt-${i}`;
  const popular = options.filter((o) => o.type === "popular");
  const rest = options.filter((o) => o.type !== "popular");
  const idxOf = (o: Option) => options.indexOf(o);

  return (
    <div className="flex max-h-[70dvh] flex-col">
      <div className="relative flex items-center gap-3 border-b border-border px-4">
        <Search aria-hidden className="size-5 shrink-0 text-primary" />
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search subjects, notes and PYQs
        </label>
        <input
          id={`${listId}-input`}
          data-autofocus
          type="text"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options.length ? optId(activeIdx) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search subjects, notes, PYQs…"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {loading ? <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
        <button type="button" onClick={close} className="rounded-md focus-visible:outline-2" aria-label="Close search">
          <Kbd>Esc</Kbd>
        </button>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {searching && !loading ? (hits.length ? `${hits.length} results` : message) : ""}
      </span>

      <ul id={listId} ref={listRef} role="listbox" aria-label={searching ? "Search results" : "Suggestions"} className="no-scrollbar flex-1 overflow-y-auto p-2">
        {!searching && (
          <li role="presentation" className="px-2 pb-3 pt-2">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles aria-hidden className="size-3.5 text-primary" /> Popular
            </p>
            <ul role="group" aria-label="Popular searches" className="flex flex-wrap gap-2">
              {popular.map((o) => {
                const i = idxOf(o);
                return (
                  <li
                    key={o.id}
                    id={optId(i)}
                    data-idx={i}
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(o);
                    }}
                    className={cn(
                      "cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      i === activeIdx ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-muted/60 text-foreground hover:border-border-strong",
                    )}
                  >
                    {o.type === "popular" && o.query}
                  </li>
                );
              })}
            </ul>
          </li>
        )}
        {!searching && (
          <li role="presentation" className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
            Jump to
          </li>
        )}
        {searching && message && !hits.length && !loading && (
          <li role="presentation" className="px-3 py-6 text-center text-sm text-muted-foreground">
            {message}
          </li>
        )}
        {rest.map((o) => {
          const i = idxOf(o);
          const on = i === activeIdx;
          let icon: React.ReactNode;
          let title: React.ReactNode;
          let sub: React.ReactNode = null;
          if (o.type === "hit") {
            icon = o.hit.kind === "subject" ? <BookOpen aria-hidden /> : <FileText aria-hidden />;
            title = (
              <span className="flex items-center gap-1.5">
                <span className="truncate">{o.hit.title}</span>
                {o.hit.premium && <Crown className="size-3.5 shrink-0 text-accent" aria-label="Premium" />}
              </span>
            );
            sub = o.hit.label;
          } else if (o.type === "link") {
            icon = o.icon === "calc" ? <Calculator aria-hidden /> : <BookOpen aria-hidden />;
            title = o.label;
            sub = o.sub;
          } else if (o.type === "all") {
            icon = <Search aria-hidden />;
            title = (
              <span className="truncate">
                See all results for <span className="text-primary">&ldquo;{o.query}&rdquo;</span>
              </span>
            );
          }
          return (
            <li
              key={o.id}
              id={optId(i)}
              data-idx={i}
              role="option"
              aria-selected={on}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              className={cn("group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", on ? "bg-primary-soft" : "hover:bg-muted")}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg border [&_svg]:size-4",
                  on ? "border-primary/30 bg-card text-primary" : "border-border bg-muted/60 text-muted-foreground",
                )}
              >
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
                {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
              </span>
              <ArrowRight aria-hidden className={cn("size-4 shrink-0 transition-all", on ? "translate-x-0 text-primary opacity-100" : "-translate-x-1 opacity-0")} />
            </li>
          );
        })}
      </ul>

      <div className="hidden items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft className="size-3" aria-hidden />
          </Kbd>
          to open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>Esc</Kbd> to close
        </span>
      </div>
    </div>
  );
}

/**
 * Button that opens the header's search palette.
 * variant "bar" (default): wide search field look with shortcut hint; "icon": square icon button.
 */
export function SearchTrigger({ className, variant = "bar", label = "Search subjects, notes, PYQs…" }: { className?: string; variant?: "bar" | "icon"; label?: string }) {
  const mod = useModKey();
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => openSearchPalette()}
        aria-label="Search"
        className={cn("inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
      >
        <Search className="size-4.5" aria-hidden />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openSearchPalette()}
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "group inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/60 pl-3 pr-1.5 text-sm text-muted-foreground transition-[border-color,background-color,box-shadow] hover:border-border-strong hover:bg-card hover:shadow-xs",
        className,
      )}
    >
      <Search className="size-4 shrink-0 transition-colors group-hover:text-primary" aria-hidden />
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="ml-2 flex shrink-0 items-center gap-0.5" aria-hidden>
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}
