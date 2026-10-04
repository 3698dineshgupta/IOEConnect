"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { DocSwitcher, DOC_GROUP_ORDER, type ViewerDoc } from "./DocSwitcher";
import { downloadPdf, printPdf } from "./download-actions";
import { PdfPage } from "./PdfPage";
import { PdfErrorCard, PdfSearchPanel, ShortcutsButton } from "./PdfPanels";
import { usePdfDocument } from "./use-pdf-document";
import { usePdfSearch } from "./use-pdf-search";
import { PdfToolbar, type ZoomMode } from "./PdfToolbar";
import { ThumbnailRail, ThumbnailSheet } from "./thumbnails";
import { PageSkeleton, ViewerStyles, ViewerTopBar, type ViewerMeta } from "./viewer-chrome";
import { prefersReducedMotion, useElementSize, useFullscreen, useIdle, useMediaQuery, useStoredFlag } from "./viewer-hooks";
import { usePinchAndTap, useStageAnchor } from "./use-stage-gestures";
import { watermarkBackground } from "./watermark";
import { clampZoom, CSS_UNITS, fitPageZoom, fitWidthZoom, MAX_FIT_CSS_WIDTH, MIN_ZOOM, stagePadX, stepZoom } from "./zoom";

export interface PdfViewerProps {
  resourceId: string;
  title: string;
  /** e.g. { "2079": [1, 4] } — enables the year jump menu */
  yearPageRanges: Record<string, [number, number]>;
  /** Shown faintly over every page (usually the viewer's email). */
  watermarkText: string;
  /** Top bar content (title, subject, badges, back link). */
  meta: ViewerMeta;
  /** Premium members and admins may download and print; computed on the server, re-checked by the download route. */
  canDownload?: boolean;
  /** Other documents of the same subject, for the top-bar switcher. */
  siblings?: ViewerDoc[];
}

export function PdfViewer({ resourceId, title, yearPageRanges, watermarkText, meta, canDownload = false, siblings = [] }: PdfViewerProps) {
  const router = useRouter();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const { phase, error, doc, numPages, refSize, sizes, loadText, onMeasured, retry } = usePdfDocument(resourceId);
  const [zoom, setZoom] = React.useState<{ mode: ZoomMode; value: number }>({ mode: "fit-width", value: 1 });
  const [rotation, setRotation] = React.useState(0);
  const [current, setCurrent] = React.useState(1);
  const [active, setActive] = React.useState<Set<number>>(() => new Set([1, 2]));
  const [notice, setNotice] = React.useState<string | null>(null);
  const [liveText, setLiveText] = React.useState("");
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const watermark = React.useMemo(() => watermarkBackground(`${watermarkText} · IOE Connect`), [watermarkText]);

  const fs = useFullscreen(rootRef);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWide = useMediaQuery("(min-width: 1280px)");
  const [railPref, setRailPref] = useStoredFlag("ioe.viewer.thumbnails", isWide);
  const railOpen = isDesktop && railPref && phase === "ready";

  // ---- measured stage + zoom ---------------------------------------------------------
  // The stage is measured after layout (non-zero clientWidth, scrollbar excluded). Until then
  // no page is drawn, so the first render already uses the real fit-width zoom.
  const box = useElementSize(scrollRef, phase);
  const swapped = rotation % 180 !== 0;
  const refW = swapped ? refSize.h : refSize.w;
  const refH = swapped ? refSize.w : refSize.h;
  const fitW = fitWidthZoom(box.w, refW, MAX_FIT_CSS_WIDTH);
  const fitP = fitPageZoom(box.w, box.h, refW, refH);
  const zoomValue = zoom.mode === "fit-width" ? fitW : zoom.mode === "fit-page" ? fitP : zoom.value;
  const scale = zoomValue == null ? null : zoomValue * CSS_UNITS;
  const padX = stagePadX(box.w);
  const padTop = (box.w < 640 ? 12 : 28) + (fs.mode !== "none" ? 56 : 0);
  const gap = box.w < 640 ? 12 : 24;

  const anchor = useStageAnchor(scrollRef, numPages, padTop);
  React.useLayoutEffect(() => anchor.restore(), [scale, rotation, anchor]);

  const zoomTo = React.useCallback(
    (z: number, focal?: { x: number; y: number }) => {
      // Huge-format pages can fit below MIN_ZOOM; let manual zoom reach the fit-page level too.
      const floor = Math.min(MIN_ZOOM, fitP ?? MIN_ZOOM);
      anchor.capture(focal);
      setZoom({ mode: "custom", value: z < MIN_ZOOM ? Math.max(floor, z) : clampZoom(z) });
    },
    [anchor, fitP],
  );
  const zoomStep = React.useCallback(
    (dir: 1 | -1) => {
      if (zoomValue == null) return;
      const next = stepZoom(zoomValue, dir);
      if ((next - zoomValue) * dir > 0) zoomTo(next, anchor.center());
    },
    [zoomValue, zoomTo, anchor],
  );
  const setFit = React.useCallback(
    (mode: "fit-width" | "fit-page", focal?: { x: number; y: number }) => {
      anchor.capture(focal ?? anchor.center());
      setZoom((z) => ({ mode, value: z.value }));
    },
    [anchor],
  );

  // ---- page tracking -----------------------------------------------------------------
  const registerEl = React.useCallback(
    (n: number, el: HTMLDivElement | null) => {
      const prev = anchor.pageEls.get(n);
      if (prev && observerRef.current) observerRef.current.unobserve(prev);
      if (el) {
        anchor.pageEls.set(n, el);
        observerRef.current?.observe(el);
      } else anchor.pageEls.delete(n);
    },
    [anchor],
  );

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root || phase !== "ready") return;
    const io = new IntersectionObserver(
      (entries) =>
        setActive((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        }),
      { root, rootMargin: "120% 60% 120% 60%" },
    );
    observerRef.current = io;
    anchor.pageEls.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, [phase, anchor]);

  const onScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el || !numPages) return;
    anchor.capture();
    setCurrent(anchor.pageAt(el.scrollTop + el.clientHeight * 0.35));
  }, [numPages, anchor]);

  const currentRef = React.useRef(current);
  React.useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const goToPage = React.useCallback(
    (n: number) => {
      const page = Math.min(Math.max(1, n), numPages || 1);
      const el = scrollRef.current;
      const pageEl = anchor.pageEls.get(page);
      if (el && pageEl) {
        const near = Math.abs(page - currentRef.current) <= 3;
        el.scrollTo({ top: pageEl.offsetTop - Math.min(padTop, 16), behavior: near && !prefersReducedMotion() ? "smooth" : "auto" });
      }
      setCurrent(page);
    },
    [numPages, anchor, padTop],
  );

  // Announce the page to screen readers once scrolling settles.
  React.useEffect(() => {
    if (!numPages) return;
    const t = window.setTimeout(() => setLiveText(`Page ${current} of ${numPages}`), 600);
    return () => window.clearTimeout(t);
  }, [current, numPages]);

  const search = usePdfSearch({ enabled: !!doc, numPages, loadText, goToPage });
  const setSearchOpen = search.setOpen;
  const openSearch = React.useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [setSearchOpen]);

  // ---- years -------------------------------------------------------------------------
  const years = React.useMemo(() => Object.entries(yearPageRanges).sort((a, b) => Number(b[0]) - Number(a[0])), [yearPageRanges]);
  const currentYear = years.find(([, [s, e]]) => current >= s && current <= e)?.[0] ?? null;

  // ---- protections + shortcuts --------------------------------------------------------
  const flash = React.useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((m) => (m === msg ? null : m)), 2500);
  }, []);

  const orderedDocs = React.useMemo(() => DOC_GROUP_ORDER.flatMap((g) => siblings.filter((d) => d.group === g)), [siblings]);
  const stepDoc = React.useCallback(
    (dir: 1 | -1) => {
      const i = orderedDocs.findIndex((d) => d.id === resourceId);
      const next = orderedDocs[i + dir];
      if (i < 0 || !next) return flash(dir === 1 ? "That is the last document." : "That is the first document.");
      router.push(`/view/${next.id}`);
    },
    [orderedDocs, resourceId, router, flash],
  );
  const [busy, setBusy] = React.useState<"download" | "print" | null>(null);
  const runExport = React.useCallback(
    async (kind: "download" | "print") => {
      if (!canDownload) {
        flash("Download and print are Premium features.");
        return;
      }
      setBusy((b) => b ?? kind);
      try {
        if (kind === "download") await downloadPdf(resourceId, title);
        else await printPdf(resourceId);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not prepare the file. Please try again.");
      } finally {
        setBusy(null);
      }
    },
    [canDownload, flash, resourceId, title],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && (k === "s" || k === "p")) {
        e.preventDefault();
        e.stopPropagation();
        if (canDownload) void runExport(k === "s" ? "download" : "print");
        else flash("Download and print are Premium features.");
        return;
      }
      if (mod && k === "f" && phase === "ready") {
        e.preventDefault();
        openSearch();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      // Switching document works at any time (even while this one is still loading).
      if ((k === "]" || k === "[") && !typing && !mod && !e.altKey && orderedDocs.length > 1) {
        e.preventDefault();
        stepDoc(k === "]" ? 1 : -1);
        return;
      }
      if (typing || mod || e.altKey || phase !== "ready") return;
      const act = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      if (k === "arrowright" || k === "pagedown") act(() => goToPage(current + 1));
      else if (k === "arrowleft" || k === "pageup") act(() => goToPage(current - 1));
      else if (k === "+" || k === "=") act(() => zoomStep(1));
      else if (k === "-" || k === "_") act(() => zoomStep(-1));
      else if (k === "0") act(() => setFit("fit-width"));
      else if (k === "f") act(() => void fs.toggle());
      else if (k === "/") act(openSearch);
      else if (k === "?") act(() => setShortcutsOpen((o) => !o));
    };
    const onCopy = (e: ClipboardEvent) => {
      if (rootRef.current?.contains(document.activeElement) || rootRef.current?.matches(":hover")) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("copy", onCopy);
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
      document.removeEventListener("copy", onCopy);
    };
  }, [current, goToPage, zoomStep, setFit, flash, phase, openSearch, fs, canDownload, runExport, orderedDocs, stepDoc]);

  // ---- ctrl/⌘ + wheel (and trackpad pinch) zoom around the pointer -----------------------
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || zoomValue == null) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomTo(zoomValue * Math.exp(-e.deltaY * 0.0025), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo, zoomValue, phase]);

  // ---- touch: pinch preview + double-tap -------------------------------------------------
  const gestures = usePinchAndTap({
    scrollRef,
    wrapperRef,
    zoom: zoomValue ?? 1,
    onPinchEnd: (ratio, focal) => zoomTo((zoomValue ?? 1) * ratio, focal),
    onDoubleTap: (focal) => {
      if (zoom.mode === "fit-width" || (fitW != null && Math.abs((zoomValue ?? 0) - fitW) < 0.02)) zoomTo(1.5, focal);
      else setFit("fit-width", focal);
    },
  });

  // Keyboard scrolling works right away: focus the stage once the first pages are laid out.
  const firstShow = phase === "ready" && scale != null;
  React.useEffect(() => {
    if (firstShow && !rootRef.current?.contains(document.activeElement)) scrollRef.current?.focus({ preventScroll: true });
  }, [firstShow]);

  const idle = useIdle(rootRef, fs.mode !== "none");
  const chromeHidden = idle && !search.open && !shortcutsOpen;

  // ---- render ---------------------------------------------------------------------------
  const pages = React.useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);
  const loginHref = `/login?next=${encodeURIComponent(`/view/${resourceId}`)}`;
  const toggleThumbs = () => (isDesktop ? setRailPref(!railPref) : setSheetOpen(true));
  const showPages = phase === "ready" && doc && scale != null;

  return (
    <>
      <div data-pdf-print-note className="hidden p-8 text-center">
        Printing is disabled for this resource.
      </div>
      <div
        ref={rootRef}
        data-pdf-viewer
        className={cn(
          "relative flex h-dvh min-h-0 flex-col overflow-hidden bg-background select-none [-webkit-touch-callout:none]",
          fs.mode === "pseudo" && "fixed inset-0 z-80",
        )}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <ViewerStyles />

        <div className={cn("pdfv-chrome", fs.mode !== "none" && "absolute inset-x-0 top-0 z-30")} data-hidden={chromeHidden ? "" : undefined}>
          <ViewerTopBar
            meta={{ ...meta, pageCount: numPages || meta.pageCount }}
            progress={numPages ? current / numPages : undefined}
            actions={
              <>
                <DocSwitcher docs={siblings} currentId={resourceId} />
                <ShortcutsButton open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
              </>
            }
          />
        </div>

        <div className="relative flex min-h-0 flex-1">
          {railOpen && doc && (
            <ThumbnailRail
              doc={doc}
              numPages={numPages}
              sizes={sizes}
              defaultSize={refSize}
              rotation={rotation}
              current={current}
              onSelect={goToPage}
              onClose={() => setRailPref(false)}
            />
          )}

          <div className="relative min-w-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={onScroll}
              {...gestures.handlers}
              className="pdfv-stage absolute inset-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              style={{ touchAction: "pan-x pan-y" }}
              tabIndex={0}
              aria-label={`${title}, document`}
              aria-busy={phase === "loading" || undefined}
            >
              {phase === "error" && error && (
                <PdfErrorCard code={error.code} message={error.message} loginHref={loginHref} onRetry={retry} />
              )}

              {phase !== "error" && !showPages && (
                <div className="flex flex-col items-center" style={{ padding: `${padTop}px ${padX}px 120px`, gap }}>
                  <p className="mb-1 inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium text-muted-foreground">
                    <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-primary" />
                    Opening document…
                  </p>
                  {[0, 1].map((i) => (
                    <PageSkeleton key={i} className="w-full" style={{ maxWidth: MAX_FIT_CSS_WIDTH, aspectRatio: `${refW} / ${refH}` }} />
                  ))}
                </div>
              )}

              {showPages && (
                <div
                  ref={wrapperRef}
                  className="mx-auto flex w-max min-w-full flex-col items-center"
                  style={{ padding: `${padTop}px ${padX}px 128px`, gap, ...gestures.wrapperStyle }}
                >
                  {pages.map((n) => (
                    <PdfPage
                      key={n}
                      doc={doc}
                      pageNumber={n}
                      scale={scale}
                      rotation={rotation}
                      size={sizes[n] ?? refSize}
                      active={active.has(n)}
                      query={search.submitted}
                      isCurrentHit={search.hits[search.hitIdx]?.page === n}
                      watermark={watermark}
                      loadText={loadText}
                      onMeasured={onMeasured}
                      registerEl={registerEl}
                    />
                  ))}
                </div>
              )}
            </div>

            {search.open && phase === "ready" && (
              <PdfSearchPanel
                inputRef={searchInputRef}
                title={title}
                query={search.query}
                onQuery={search.setQuery}
                onSubmit={search.submit}
                submitted={search.submitted}
                hits={search.hits}
                hitIdx={search.hitIdx}
                progress={search.progress}
                onJump={search.jump}
                onSelect={search.select}
                onClose={search.close}
              />
            )}

            {phase !== "error" && (
              <div
                className="pdfv-chrome pointer-events-none absolute inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-2 sm:bottom-6"
                data-hidden={chromeHidden ? "" : undefined}
              >
                <div className="pointer-events-auto">
                  <PdfToolbar
                    disabled={!showPages}
                    page={current}
                    numPages={numPages}
                    onGoTo={goToPage}
                    zoom={zoomValue ?? 1}
                    zoomMode={zoom.mode}
                    onZoomIn={() => zoomStep(1)}
                    onZoomOut={() => zoomStep(-1)}
                    onZoomTo={(z) => zoomTo(z, anchor.center())}
                    onFitWidth={() => setFit("fit-width")}
                    onFitPage={() => setFit("fit-page")}
                    onRotate={() => setRotation((r) => (r + 90) % 360)}
                    years={years}
                    currentYear={currentYear}
                    onYear={(y) => {
                      const r = yearPageRanges[y];
                      if (r) goToPage(r[0]);
                    }}
                    thumbsOpen={railOpen || sheetOpen}
                    onToggleThumbs={toggleThumbs}
                    searchOpen={search.open}
                    onToggleSearch={() => (search.open ? search.close() : openSearch())}
                    fullscreen={fs.mode !== "none"}
                    onToggleFullscreen={() => void fs.toggle()}
                    canDownload={canDownload}
                    busy={busy}
                    onDownload={() => void runExport("download")}
                    onPrint={() => void runExport("print")}
                  />
                </div>
              </div>
            )}

            {notice && (
              <div role="status" className="pointer-events-none absolute inset-x-0 top-4 z-50 flex justify-center px-4">
                <span className="pdfv-glass rounded-full px-4 py-2 text-sm font-medium text-foreground">{notice}</span>
              </div>
            )}
          </div>
        </div>

        {doc && !isDesktop && (
          <ThumbnailSheet
            doc={doc}
            numPages={numPages}
            sizes={sizes}
            defaultSize={refSize}
            rotation={rotation}
            current={current}
            onSelect={goToPage}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
          />
        )}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {liveText}
        </div>
      </div>
    </>
  );
}
