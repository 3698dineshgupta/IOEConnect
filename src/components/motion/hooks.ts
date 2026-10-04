"use client";

import { useMemo, useSyncExternalStore, type RefObject } from "react";
import { useInView as useMotionInView, useReducedMotion as useMotionReducedMotion } from "motion/react";

function mediaStore(query: string) {
  return {
    subscribe(cb: () => void) {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    get() {
      return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
    },
  };
}

const reduced = mediaStore("(prefers-reduced-motion: reduce)");
const finePointer = mediaStore("(hover: hover) and (pointer: fine)");
const noop = () => () => {};

/**
 * `true` when the user prefers reduced motion. SSR-safe: returns `false` on the server
 * and during hydration, then the real value. Wraps motion's hook and coerces null → false.
 */
export function useReducedMotion(): boolean {
  const fromMotion = useMotionReducedMotion();
  const fromMedia = useSyncExternalStore(reduced.subscribe, reduced.get, () => false);
  return Boolean(fromMotion ?? fromMedia);
}

/** `true` on devices with a precise, hover-capable pointer (desktop mouse/trackpad). `false` on server/touch. */
export function useFinePointer(): boolean {
  return useSyncExternalStore(finePointer.subscribe, finePointer.get, () => false);
}

/** `true` once mounted on the client. Use to gate browser-only rendering without hydration mismatch. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Generic media-query hook (SSR → `fallback`). */
export function useMediaQuery(query: string, fallback = false): boolean {
  const store = useMemo(() => mediaStore(query), [query]);
  return useSyncExternalStore(store.subscribe, store.get, () => fallback);
}

/**
 * Viewport visibility of `ref`. Thin wrapper over motion's `useInView` with sensible defaults
 * (`once: true`, starts a little before entering via `margin`).
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = true, margin = "0px 0px -10% 0px", amount = "some" }: {
    once?: boolean;
    margin?: string;
    amount?: "some" | "all" | number;
  } = {},
): boolean {
  // motion types margin as a CSS-like template string
  return useMotionInView(ref as RefObject<Element>, { once, margin: margin as `${number}px`, amount });
}

/** `true` while the document tab is visible. */
const visibility = {
  subscribe(cb: () => void) {
    document.addEventListener("visibilitychange", cb);
    return () => document.removeEventListener("visibilitychange", cb);
  },
  get: () => document.visibilityState !== "hidden",
};
export function usePageVisible(): boolean {
  return useSyncExternalStore(visibility.subscribe, visibility.get, () => true);
}
