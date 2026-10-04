"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Crown, FileWarning, Keyboard, LogIn, RefreshCw, Search, TriangleAlert, WifiOff, X } from "lucide-react";
import { Button, buttonVariants, Kbd } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ViewerStateCard } from "./viewer-chrome";

export interface SearchHit {
  page: number;
  count: number;
  snippet: string;
}

const iconBtn =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-foreground/7 hover:text-foreground disabled:opacity-35";

export function PdfSearchPanel({
  inputRef,
  title,
  query,
  onQuery,
  onSubmit,
  submitted,
  hits,
  hitIdx,
  progress,
  onJump,
  onSelect,
  onClose,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  title: string;
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  submitted: string;
  hits: SearchHit[];
  hitIdx: number;
  progress: number | null;
  onJump: (delta: number) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const total = hits.reduce((a, h) => a + h.count, 0);
  const status =
    progress != null
      ? `Searching… ${Math.round(progress * 100)}%`
      : submitted.length >= 2
        ? hits.length
          ? `${total} ${total === 1 ? "match" : "matches"} on ${hits.length} ${hits.length === 1 ? "page" : "pages"}`
          : "No matches"
        : "Type at least 2 characters, then press Enter";

  return (
    <div
      role="search"
      className="pdfv-glass absolute inset-x-2 top-2 z-40 animate-pop-in rounded-2xl p-2 sm:left-auto sm:right-4 sm:top-4 sm:w-[24rem]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            aria-label="Search in document"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={`Search “${title.length > 28 ? `${title.slice(0, 28)}…` : title}”`}
            className="h-10 w-full rounded-xl border border-foreground/10 bg-background/70 pl-9 pr-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <button type="button" aria-label="Previous match" className={iconBtn} disabled={!hits.length} onClick={() => onJump(-1)}>
          <ChevronUp className="size-4" />
        </button>
        <button type="button" aria-label="Next match" className={iconBtn} disabled={!hits.length} onClick={() => onJump(1)}>
          <ChevronDown className="size-4" />
        </button>
        <button type="button" aria-label="Close search" className={iconBtn} onClick={onClose}>
          <X className="size-4" />
        </button>
      </form>
      <p className="px-1.5 pb-0.5 pt-2 text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {status}
        {progress != null && (
          <span aria-hidden className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-foreground/10">
            <span className="block h-full origin-left bg-primary transition-transform" style={{ transform: `scaleX(${progress})` }} />
          </span>
        )}
      </p>
      {hits.length > 0 && (
        <ul className="mt-1 max-h-[min(40dvh,16rem)] space-y-0.5 overflow-y-auto scrollbar-thin">
          {hits.map((h, i) => (
            <li key={h.page}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={i === hitIdx || undefined}
                className={cn(
                  "w-full rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                  i === hitIdx ? "bg-primary/10" : "hover:bg-foreground/6",
                )}
              >
                <span className={cn("font-semibold", i === hitIdx ? "text-primary" : "text-foreground")}>Page {h.page}</span>
                <span className="text-muted-foreground"> · {h.count}</span>
                <span className="mt-0.5 line-clamp-2 block leading-5 text-muted-foreground">{h.snippet}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PdfErrorCard({
  code,
  message,
  loginHref,
  onRetry,
}: {
  code: string;
  message: string;
  loginHref: string;
  onRetry: () => void;
}) {
  if (code === "LOGIN_REQUIRED") {
    return (
      <ViewerStateCard
        icon={<LogIn />}
        title="Sign in to keep reading"
        description={message}
        action={
          <Link href={loginHref} className={buttonVariants({ variant: "primary" })}>
            Sign in
          </Link>
        }
      />
    );
  }
  if (code === "PREMIUM_REQUIRED") {
    return (
      <ViewerStateCard
        tone="accent"
        icon={<Crown />}
        title="This is a Premium resource"
        description={message}
        action={
          <Link href="/premium" className={buttonVariants({ variant: "accent" })}>
            <Crown /> Get Premium
          </Link>
        }
      />
    );
  }
  if (code === "SESSION_MISMATCH") {
    return (
      <ViewerStateCard
        tone="neutral"
        icon={<RefreshCw />}
        title="Your session changed"
        description={message}
        action={
          <Button onClick={() => window.location.reload()}>
            <RefreshCw /> Reload page
          </Button>
        }
      />
    );
  }
  const final = code === "PASSWORD" || code === "INVALID" || code === "NOT_FOUND";
  return (
    <ViewerStateCard
      tone={final ? "neutral" : "danger"}
      icon={final ? <FileWarning /> : code === "NETWORK" ? <WifiOff /> : <TriangleAlert />}
      title={final ? "This document can’t be shown" : "The document didn’t load"}
      description={message}
      action={
        final ? undefined : (
          <Button onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )
      }
    />
  );
}

const SHORTCUTS: [React.ReactNode, string][] = [
  [<><Kbd>←</Kbd><Kbd>→</Kbd></>, "Previous / next page"],
  [<><Kbd>PgUp</Kbd><Kbd>PgDn</Kbd></>, "Previous / next page"],
  [<><Kbd>+</Kbd><Kbd>−</Kbd></>, "Zoom in / out"],
  [<Kbd key="0">0</Kbd>, "Fit width"],
  [<Kbd key="f">F</Kbd>, "Full screen"],
  [<span key="docs" className="inline-flex gap-1"><Kbd>[</Kbd><Kbd>]</Kbd></span>, "Previous / next document"],
  [<><Kbd>/</Kbd><Kbd>Ctrl F</Kbd></>, "Search"],
  [<Kbd key="q">?</Kbd>, "Show shortcuts"],
];

/** Keyboard icon in the top bar that opens a small shortcuts card. Desktop only. */
export function ShortcutsButton({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onOpenChange(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);
  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        <Keyboard className="size-4.5" aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-label="Keyboard shortcuts" className="pdfv-glass absolute right-0 top-full z-50 mt-2 w-72 animate-pop-in rounded-2xl p-3">
          <p className="px-1 pb-2 text-xs font-semibold text-foreground">Keyboard shortcuts</p>
          <dl className="space-y-1.5">
            {SHORTCUTS.map(([keys, label], i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-1 text-xs">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="flex shrink-0 gap-1">{keys}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
