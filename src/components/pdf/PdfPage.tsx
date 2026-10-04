"use client";

import * as React from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { cn } from "@/lib/utils";
import { acquirePageRender, isCancel } from "./render-queue";
import { outputScale } from "./zoom";

export type TextItem = Extract<Awaited<ReturnType<PDFPageProxy["getTextContent"]>>["items"][number], { str: string }>;

export interface PageSize {
  /** Width/height in PDF points at scale 1, intrinsic page rotation applied. */
  w: number;
  h: number;
}

export type TextLoader = (pageNumber: number) => Promise<TextItem[]>;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Max canvas backing-store pixels per page (keeps mobile memory in check). */
const MAX_CANVAS_PIXELS = 12_000_000;
/** A page must stay in the render window this long before rendering starts, so fast scrolls skip it. */
const RENDER_DELAY_MS = 70;

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  /** pdf.js viewport scale (zoom * CSS_UNITS) */
  scale: number;
  /** extra user rotation (0/90/180/270) */
  rotation: number;
  size: PageSize;
  /** within the render window (near the viewport) */
  active: boolean;
  query: string;
  isCurrentHit: boolean;
  watermark: string;
  loadText: TextLoader;
  onMeasured: (pageNumber: number, size: PageSize) => void;
  registerEl: (pageNumber: number, el: HTMLDivElement | null) => void;
}

export function displaySize(size: PageSize, rotation: number, scale: number) {
  const swap = rotation % 180 !== 0;
  return { width: Math.floor((swap ? size.h : size.w) * scale), height: Math.floor((swap ? size.w : size.h) * scale) };
}

export const PdfPage = React.memo(function PdfPage({
  doc,
  pageNumber,
  scale,
  rotation,
  size,
  active,
  query,
  isCurrentHit,
  watermark,
  loadText,
  onMeasured,
  registerEl,
}: PdfPageProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [hits, setHits] = React.useState<Rect[]>([]);
  const { width, height } = displaySize(size, rotation, scale);

  const setRef = React.useCallback((el: HTMLDivElement | null) => registerEl(pageNumber, el), [registerEl, pageNumber]);

  // Render while in the render window; release the canvas memory when scrolled far away.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!active) {
      canvas.width = 0;
      canvas.height = 0;
      setRendered(false);
      return;
    }
    const ac = new AbortController();
    let task: RenderTask | null = null;
    const timer = window.setTimeout(async () => {
      let release: (() => void) | null = null;
      try {
        release = await acquirePageRender(ac.signal);
        const page = await doc.getPage(pageNumber);
        if (ac.signal.aborted) return;
        const base = page.getViewport({ scale: 1 });
        if (Math.abs(base.width - size.w) > 0.5 || Math.abs(base.height - size.h) > 0.5) {
          onMeasured(pageNumber, { w: base.width, h: base.height });
        }
        const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
        const os = outputScale(window.devicePixelRatio || 1, viewport.width, viewport.height, MAX_CANVAS_PIXELS);

        // Render offscreen, then swap, so zooming never flashes a blank page.
        const off = document.createElement("canvas");
        off.width = Math.max(1, Math.floor(viewport.width * os));
        off.height = Math.max(1, Math.floor(viewport.height * os));
        task = page.render({
          canvas: off,
          viewport,
          transform: os !== 1 ? [os, 0, 0, os, 0, 0] : undefined,
        });
        await task.promise;
        if (ac.signal.aborted) return;
        canvas.width = off.width;
        canvas.height = off.height;
        canvas.getContext("2d")?.drawImage(off, 0, 0);
        off.width = 0;
        off.height = 0;
        setRendered(true);
        setFailed(false);
      } catch (err) {
        if (ac.signal.aborted || isCancel(err)) return;
        console.error("[pdf] page render failed", pageNumber, err);
        setFailed(true);
      } finally {
        release?.();
      }
    }, RENDER_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
      task?.cancel();
    };
    // size intentionally omitted: a measurement update must not re-trigger rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber, scale, rotation, active, onMeasured]);

  // Search highlights (item-level rectangles from getTextContent()).
  React.useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!active || q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [items, page] = await Promise.all([loadText(pageNumber), doc.getPage(pageNumber)]);
        if (cancelled) return;
        const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
        const rects: Rect[] = [];
        for (const item of items) {
          if (!item.str || !item.str.toLowerCase().includes(q)) continue;
          const [, , , d, e, f] = item.transform as number[];
          const h = item.height || Math.abs(d) || 10;
          const [x1, y1] = viewport.convertToViewportPoint(e, f - h * 0.2);
          const [x2, y2] = viewport.convertToViewportPoint(e + item.width, f + h);
          rects.push({ left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) });
        }
        setHits(rects);
      } catch {
        if (!cancelled) setHits([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, query, doc, pageNumber, scale, rotation, loadText]);

  return (
    <div
      ref={setRef}
      data-page={pageNumber}
      className="pdfv-page relative mx-auto shrink-0 overflow-hidden rounded-[3px]"
      style={{ width, height }}
      aria-label={`Page ${pageNumber}`}
      role="img"
    >
      <canvas
        ref={canvasRef}
        className="pdfv-canvas pointer-events-none block select-none"
        data-ready={rendered ? "" : undefined}
        style={{ width, height }}
        draggable={false}
      />
      {!rendered && !failed && (
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-x-[9%] top-[8%] h-[1.6%] w-2/5 rounded-full bg-slate-200/80" />
          <div className="absolute inset-x-[9%] top-[13%] h-[1.1%] rounded-full bg-slate-100" />
          <div className="absolute inset-x-[9%] top-[16.5%] h-[1.1%] w-4/5 rounded-full bg-slate-100" />
          <div className="absolute inset-x-[9%] top-[20%] h-[1.1%] w-3/5 rounded-full bg-slate-100" />
          <div className="absolute inset-x-[9%] top-[27%] h-[16%] rounded-md bg-slate-100/80" />
          <div className="shimmer absolute inset-0" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-4 text-center text-sm text-slate-500">
          Page {pageNumber} could not be displayed.
        </div>
      )}
      {hits.map((r, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-[2px] mix-blend-multiply",
            isCurrentHit ? "bg-amber-400/55 ring-1 ring-amber-500/80" : "bg-yellow-300/45",
          )}
          style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
          aria-hidden
        />
      ))}
      {/* Watermark over the rendered page (pointer-events none, captured in screenshots). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none" style={{ backgroundImage: watermark, backgroundRepeat: "repeat" }} />
      <span className="pointer-events-none absolute bottom-2 right-2 select-none rounded-md bg-slate-900/70 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white/95 tabular-nums backdrop-blur-sm">
        {pageNumber}
      </span>
    </div>
  );
});
