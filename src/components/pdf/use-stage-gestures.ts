"use client";

import * as React from "react";
import { MAX_ZOOM, MIN_ZOOM } from "./zoom";

type Point = { x: number; y: number };

/**
 * Remembers which point of which page sits at a given spot of the stage, so zoom, rotation and
 * re-fits keep the reader's place (around the pointer/fingers, or the top of the view).
 */
export function useStageAnchor(scrollRef: React.RefObject<HTMLDivElement | null>, numPages: number, padTop: number) {
  const state = React.useRef({ numPages, padTop });
  React.useEffect(() => {
    state.current = { numPages, padTop };
  }, [numPages, padTop]);

  const [api] = React.useState(() => {
    const pageEls = new Map<number, HTMLDivElement>();
    let anchor: { page: number; fx: number; fy: number; vx: number; vy: number } | null = null;

    const pageAt = (y: number) => {
      let lo = 1;
      let hi = Math.max(1, state.current.numPages);
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if ((pageEls.get(mid)?.offsetTop ?? 0) <= y) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    };
    const center = (): Point => {
      const el = scrollRef.current;
      return { x: (el?.clientWidth ?? 0) / 2, y: (el?.clientHeight ?? 0) / 2 };
    };
    /** Record the content point under `focal` (stage coords). Default: horizontal centre, top edge. */
    const capture = (focal?: Point) => {
      const el = scrollRef.current;
      if (!el || !pageEls.size) return;
      const vx = focal?.x ?? el.clientWidth / 2;
      const vy = focal?.y ?? 0;
      const page = pageAt(el.scrollTop + vy);
      const pe = pageEls.get(page);
      if (!pe) return;
      anchor = {
        page,
        fx: (el.scrollLeft + vx - pe.offsetLeft) / Math.max(1, pe.offsetWidth),
        fy: (el.scrollTop + vy - pe.offsetTop) / Math.max(1, pe.offsetHeight),
        vx,
        vy,
      };
    };
    const restore = () => {
      const el = scrollRef.current;
      const pe = anchor && pageEls.get(anchor.page);
      if (!el || !anchor || !pe) return;
      el.scrollTop = pe.offsetTop + anchor.fy * pe.offsetHeight - anchor.vy;
      el.scrollLeft = pe.offsetLeft + anchor.fx * pe.offsetWidth - anchor.vx;
    };
    return { pageEls, pageAt, center, capture, restore };
  });
  return api;
}

const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
const mid = (t: React.TouchList): Point => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

/**
 * Two-finger pinch previews with a CSS transform (cheap, follows the fingers) and re-renders
 * crisply at the new zoom on release, keeping the point under the fingers in place.
 * Double-tap toggles between fit width and 150%. Listeners are passive: one-finger scrolling
 * and momentum stay native.
 */
export function usePinchAndTap({
  scrollRef,
  wrapperRef,
  zoom,
  onPinchEnd,
  onDoubleTap,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onPinchEnd: (ratio: number, focal: Point) => void;
  onDoubleTap: (focal: Point) => void;
}) {
  const [pinch, setPinch] = React.useState<{ ratio: number; ox: number; oy: number } | null>(null);
  const start = React.useRef<{ dist: number; focal: Point } | null>(null);
  const tap = React.useRef<{ t: number; x: number; y: number; moved: boolean; last: number; lx: number; ly: number }>({
    t: 0,
    x: 0,
    y: 0,
    moved: false,
    last: 0,
    lx: 0,
    ly: 0,
  });

  const stagePoint = (p: Point): Point => {
    const r = scrollRef.current?.getBoundingClientRect();
    return { x: p.x - (r?.left ?? 0), y: p.y - (r?.top ?? 0) };
  };

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        tap.current = { ...tap.current, t: e.timeStamp, x: t.clientX, y: t.clientY, moved: false };
        return;
      }
      tap.current.moved = true;
      if (e.touches.length !== 2 || !wrapperRef.current) return;
      const m = mid(e.touches);
      const r = wrapperRef.current.getBoundingClientRect();
      start.current = { dist: dist(e.touches), focal: stagePoint(m) };
      setPinch({ ratio: 1, ox: m.x - r.left, oy: m.y - r.top });
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (Math.hypot(t.clientX - tap.current.x, t.clientY - tap.current.y) > 10) tap.current.moved = true;
      }
      if (e.touches.length !== 2 || !start.current) return;
      const ratio = Math.min(MAX_ZOOM / zoom, Math.max(MIN_ZOOM / zoom, dist(e.touches) / start.current.dist));
      setPinch((p) => (p ? { ...p, ratio } : p));
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (start.current) {
        if (e.touches.length >= 2) return;
        const focal = start.current.focal;
        start.current = null;
        if (pinch && Math.abs(pinch.ratio - 1) > 0.02) onPinchEnd(pinch.ratio, focal);
        setPinch(null);
        return;
      }
      const t = tap.current;
      if (e.touches.length || t.moved || e.timeStamp - t.t > 300) return;
      const isDouble = e.timeStamp - t.last < 320 && Math.hypot(t.x - t.lx, t.y - t.ly) < 30;
      if (isDouble) {
        t.last = 0;
        onDoubleTap(stagePoint({ x: t.x, y: t.y }));
      } else {
        t.last = e.timeStamp;
        t.lx = t.x;
        t.ly = t.y;
      }
    },
    onTouchCancel: () => {
      start.current = null;
      setPinch(null);
    },
  };

  const wrapperStyle: React.CSSProperties = pinch
    ? { transform: `scale(${pinch.ratio})`, transformOrigin: `${pinch.ox}px ${pinch.oy}px`, willChange: "transform" }
    : {};

  return { handlers, wrapperStyle };
}
