"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { openPdf, PdfAccessError, PdfSession, type OpenedPdf } from "./pdf-loader";
import type { PageSize, TextItem } from "./PdfPage";

export type Phase = "loading" | "ready" | "error";
export interface ViewerError {
  code: string;
  message: string;
}

function toViewerError(err: unknown): ViewerError {
  if (err instanceof PdfAccessError) return { code: err.code, message: err.message };
  const name = (err as { name?: string })?.name;
  if (name === "PasswordException") return { code: "PASSWORD", message: "This PDF is password protected and cannot be shown." };
  if (name === "InvalidPDFException") return { code: "INVALID", message: "This file could not be read as a PDF." };
  return { code: "UNKNOWN", message: "The document could not be loaded. Check your connection and try again." };
}

/** Typical page size: the median width among the first few pages, so one oversized cover scan doesn't set the zoom. */
async function referenceSize(doc: PDFDocumentProxy): Promise<{ first: PageSize; ref: PageSize }> {
  const n = Math.min(doc.numPages, 5);
  const sizes = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      doc
        .getPage(i + 1)
        .then((p) => p.getViewport({ scale: 1 }))
        .then((v) => ({ w: v.width, h: v.height }))
        .catch(() => null),
    ),
  );
  if (!sizes[0]) throw new Error("The first page could not be read");
  const sorted = sizes.filter((s): s is PageSize => !!s).sort((a, b) => a.w - b.w);
  return { first: sizes[0], ref: sorted[Math.floor((sorted.length - 1) / 2)] };
}

/** Opens the document through the secure loader (see pdf-loader.ts) and caches page text for search. */
export function usePdfDocument(resourceId: string) {
  const textCache = React.useRef(new Map<number, Promise<TextItem[]>>());
  const [loadKey, setLoadKey] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [error, setError] = React.useState<ViewerError | null>(null);
  const [doc, setDoc] = React.useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = React.useState(0);
  const [refSize, setRefSize] = React.useState<PageSize>({ w: 595, h: 842 });
  const [sizes, setSizes] = React.useState<Record<number, PageSize>>({});

  React.useEffect(() => {
    const ac = new AbortController();
    const session = new PdfSession(resourceId);
    let opened: OpenedPdf | null = null;
    const cache = textCache.current;
    const fail = (err: unknown) => {
      if (ac.signal.aborted) return;
      console.error("[pdf] load failed", err);
      setError(toViewerError(err));
      setPhase("error");
    };
    openPdf(session, { signal: ac.signal, onTransportError: fail })
      .then(async (o) => {
        opened = o;
        if (ac.signal.aborted) return;
        const { first, ref } = await referenceSize(o.doc);
        if (ac.signal.aborted) return;
        setRefSize(ref);
        setSizes({ 1: first });
        setNumPages(o.doc.numPages);
        setDoc(o.doc);
        setPhase("ready");
      })
      .catch(fail);
    return () => {
      ac.abort();
      cache.clear();
      void opened?.task.destroy();
      setDoc(null);
    };
  }, [resourceId, loadKey]);

  const loadText = React.useCallback(
    (n: number) => {
      const cache = textCache.current;
      let p = cache.get(n);
      if (!p && doc) {
        p = doc
          .getPage(n)
          .then((page) => page.getTextContent())
          .then((tc) => tc.items.filter((i): i is TextItem => "str" in i));
        p.catch(() => cache.delete(n));
        cache.set(n, p);
      }
      return p ?? Promise.resolve([]);
    },
    [doc],
  );

  const onMeasured = React.useCallback((n: number, size: PageSize) => {
    setSizes((prev) => (prev[n] && prev[n].w === size.w && prev[n].h === size.h ? prev : { ...prev, [n]: size }));
  }, []);

  const retry = React.useCallback(() => {
    setError(null);
    setPhase("loading");
    setLoadKey((k) => k + 1);
  }, []);

  return { phase, error, doc, numPages, refSize, sizes, loadText, onMeasured, retry };
}
