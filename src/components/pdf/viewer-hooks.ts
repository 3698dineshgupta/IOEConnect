"use client";

import * as React from "react";

/**
 * Inner size (clientWidth/clientHeight, scrollbar excluded) of an element. Stays {0,0} until
 * the element has a real, non-zero layout box, so callers can wait for it instead of fitting
 * a page into a box that has not been laid out yet.
 */
export function useElementSize(ref: React.RefObject<HTMLElement | null>, key?: unknown) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(read);
    });
    ro.observe(el); // fires once immediately with the current box
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, key]);
  return size;
}

export function useMediaQuery(query: string): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Boolean preference in localStorage. Storage can be unavailable; the default then applies. */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [stored, setStored] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only storage after hydration
      if (v === "1" || v === "0") setStored(v === "1");
    } catch {
      /* storage blocked: keep the default */
    }
  }, [key]);
  const set = React.useCallback(
    (v: boolean) => {
      setStored(v);
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [stored ?? fallback, set];
}

export type FullscreenMode = "none" | "native" | "pseudo";

/** Element fullscreen with a CSS fallback (iOS Safari has no element fullscreen). */
export function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [mode, setMode] = React.useState<FullscreenMode>("none");
  React.useEffect(() => {
    const onChange = () =>
      setMode((prev) => (document.fullscreenElement === ref.current ? "native" : prev === "native" ? "none" : prev));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [ref]);
  React.useEffect(() => {
    if (mode !== "pseudo") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMode("none");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);
  const toggle = React.useCallback(async () => {
    if (mode === "native") return void document.exitFullscreen().catch(() => setMode("none"));
    if (mode === "pseudo") return setMode("none");
    const el = ref.current;
    try {
      if (!el?.requestFullscreen) throw new Error("unsupported");
      await el.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setMode("pseudo");
    }
  }, [mode, ref]);
  return { mode, toggle };
}

/** True after `ms` without pointer, touch, wheel or key activity inside `ref` (only while enabled). */
export function useIdle(ref: React.RefObject<HTMLElement | null>, enabled: boolean, ms = 2600) {
  const [idle, setIdle] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setIdle(false);
      return;
    }
    let t = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(t);
      t = window.setTimeout(() => setIdle(true), ms);
    };
    const events = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown"] as const;
    events.forEach((ev) => el.addEventListener(ev, wake, { passive: true }));
    return () => {
      window.clearTimeout(t);
      events.forEach((ev) => el.removeEventListener(ev, wake));
    };
  }, [ref, enabled, ms]);
  return idle;
}
