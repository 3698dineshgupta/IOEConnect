"use client";

import * as React from "react";
import type { TextItem } from "./PdfPage";
import type { SearchHit } from "./PdfPanels";

/** Full-text search over pdf.js getTextContent(), page by page, cancellable. */
export function usePdfSearch({
  enabled,
  numPages,
  loadText,
  goToPage,
}: {
  enabled: boolean;
  numPages: number;
  loadText: (page: number) => Promise<TextItem[]>;
  goToPage: (page: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [submitted, setSubmitted] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [hitIdx, setHitIdx] = React.useState(0);
  const [progress, setProgress] = React.useState<number | null>(null);
  const runRef = React.useRef(0);

  const run = async (raw: string) => {
    const q = raw.trim().toLowerCase();
    const id = ++runRef.current;
    setSubmitted(q);
    setHits([]);
    setHitIdx(0);
    if (q.length < 2 || !enabled) {
      setProgress(null);
      return;
    }
    const found: SearchHit[] = [];
    for (let n = 1; n <= numPages; n++) {
      if (id !== runRef.current) return;
      try {
        const text = (await loadText(n)).map((i) => i.str).join(" ").replace(/\s+/g, " ");
        const lower = text.toLowerCase();
        const first = lower.indexOf(q);
        let count = 0;
        for (let idx = first; idx !== -1; idx = lower.indexOf(q, idx + q.length)) count++;
        if (count) {
          const s = Math.max(0, first - 40);
          found.push({ page: n, count, snippet: `${s > 0 ? "…" : ""}${text.slice(s, first + q.length + 60)}…` });
          if (found.length === 1) goToPage(n);
        }
      } catch {
        /* skip unreadable page */
      }
      if (n % 5 === 0 || n === numPages) {
        setHits([...found]);
        setProgress(n / numPages);
      }
    }
    if (id === runRef.current) setProgress(null);
  };

  const select = (i: number) => {
    if (!hits[i]) return;
    setHitIdx(i);
    goToPage(hits[i].page);
  };

  return {
    open,
    setOpen,
    query,
    setQuery,
    submitted,
    hits,
    hitIdx,
    progress,
    select,
    jump: (delta: number) => hits.length && select((hitIdx + delta + hits.length) % hits.length),
    submit: () => {
      if (query.trim().toLowerCase() === submitted && hits.length) select((hitIdx + 1) % hits.length);
      else void run(query);
    },
    close: () => {
      runRef.current++;
      setOpen(false);
      setSubmitted("");
      setHits([]);
      setProgress(null);
    },
  };
}
