"use client";

import * as React from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PageSize } from "./PdfPage";
import { acquireThumbRender, isCancel } from "./render-queue";
import { outputScale } from "./zoom";

/** Thumbnails render at this CSS width; tiny pixel budget per page. */
const THUMB_CSS_W = 112;

interface ThumbProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  size: PageSize;
  rotation: number;
  current: boolean;
  onSelect: (n: number) => void;
  root: React.RefObject<HTMLElement | null>;
}

const Thumb = React.memo(function Thumb({ doc, pageNumber, size, rotation, current, onSelect, root }: ThumbProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const swap = rotation % 180 !== 0;
  const ratio = (swap ? size.w : size.h) / (swap ? size.h : size.w);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      root: root.current,
      rootMargin: "200px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      canvas.width = 0;
      canvas.height = 0;
      setReady(false); // eslint-disable-line react-hooks/set-state-in-effect -- canvas released when far away
      return;
    }
    const ac = new AbortController();
    let task: RenderTask | null = null;
    const timer = window.setTimeout(async () => {
      let release: (() => void) | null = null;
      try {
        release = await acquireThumbRender(ac.signal);
        const page = await doc.getPage(pageNumber);
        if (ac.signal.aborted) return;
        const base = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
        const viewport = page.getViewport({ scale: THUMB_CSS_W / base.width, rotation: (page.rotate + rotation) % 360 });
        const os = outputScale(window.devicePixelRatio || 1, viewport.width, viewport.height, 400_000);
        canvas.width = Math.max(1, Math.floor(viewport.width * os));
        canvas.height = Math.max(1, Math.floor(viewport.height * os));
        task = page.render({ canvas, viewport, transform: os !== 1 ? [os, 0, 0, os, 0, 0] : undefined });
        await task.promise;
        if (!ac.signal.aborted) setReady(true);
      } catch (err) {
        if (!ac.signal.aborted && !isCancel(err)) console.error("[pdf] thumbnail failed", pageNumber, err);
      } finally {
        release?.();
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
      task?.cancel();
    };
  }, [visible, doc, pageNumber, rotation]);

  return (
    <button
      ref={ref}
      type="button"
      data-thumb={pageNumber}
      onClick={() => onSelect(pageNumber)}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={current ? "page" : undefined}
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl p-1.5 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "pdfv-page relative block w-full overflow-hidden rounded-[3px] transition-[outline-color] duration-150",
          current ? "outline-2 outline-offset-2 outline-primary" : "outline-2 outline-offset-2 outline-transparent",
        )}
        style={{ aspectRatio: `1 / ${ratio}` }}
      >
        {!ready && <span aria-hidden className="shimmer absolute inset-0 bg-slate-100" />}
        <canvas ref={canvasRef} className="pdfv-canvas block size-full" data-ready={ready ? "" : undefined} />
      </span>
      <span
        className={cn(
          "font-mono text-[11px] leading-4 tabular-nums",
          current ? "font-semibold text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {pageNumber}
      </span>
    </button>
  );
});

interface ThumbListProps {
  doc: PDFDocumentProxy;
  numPages: number;
  sizes: Record<number, PageSize>;
  defaultSize: PageSize;
  rotation: number;
  current: number;
  onSelect: (n: number) => void;
}

/** IntersectionObserver root = the viewport (used inside the sheet, whose panel is in view). */
const VIEWPORT_ROOT: React.RefObject<HTMLElement | null> = { current: null };

function ThumbGrid({ root, className, current, ...p }: ThumbListProps & { root: React.RefObject<HTMLElement | null>; className?: string }) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const pages = React.useMemo(() => Array.from({ length: p.numPages }, (_, i) => i + 1), [p.numPages]);
  // Keep the current page's thumbnail in view.
  React.useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>(`[data-thumb="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);
  return (
    <div ref={gridRef} className={className}>
      {pages.map((n) => (
        <Thumb
          key={n}
          doc={p.doc}
          pageNumber={n}
          size={p.sizes[n] ?? p.defaultSize}
          rotation={p.rotation}
          current={n === current}
          onSelect={p.onSelect}
          root={root}
        />
      ))}
    </div>
  );
}

/** Desktop rail (lg+). */
export function ThumbnailRail({ onClose, ...p }: ThumbListProps & { onClose: () => void }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  return (
    <aside
      aria-label="Page thumbnails"
      className="hidden w-48 shrink-0 flex-col border-r border-border bg-surface-elevated/70 backdrop-blur-xl lg:flex"
    >
      <div className="flex h-11 shrink-0 items-center justify-between pl-4 pr-1.5">
        <p className="text-xs font-semibold text-foreground">
          Pages <span className="ml-1 font-normal tabular-nums text-muted-foreground">{p.numPages}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide thumbnails"
          title="Hide thumbnails"
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 scrollbar-thin">
        <ThumbGrid {...p} root={scrollRef} className="flex flex-col gap-2" />
      </div>
    </aside>
  );
}

/** Mobile/tablet bottom sheet. */
export function ThumbnailSheet({
  open,
  onOpenChange,
  ...p
}: ThumbListProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title="Pages" description={`${p.numPages} pages · tap one to jump to it`}>
      {open && (
        <ThumbGrid
          {...p}
          onSelect={(n) => {
            p.onSelect(n);
            onOpenChange(false);
          }}
          root={VIEWPORT_ROOT}
          className="grid grid-cols-3 gap-2 pb-[env(safe-area-inset-bottom)] sm:grid-cols-4 md:grid-cols-5"
        />
      )}
    </Sheet>
  );
}
