"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useInView } from "motion/react";
import { useMediaQuery, useMounted, usePageVisible, useReducedMotion, useFinePointer } from "@/components/motion/hooks";
import { HeroSceneFallback, ProgramSceneFallback } from "./fallbacks";

const HeroCanvas = dynamic(() => import("./hero-scene"), { ssr: false, loading: () => null });
const ProgramCanvas = dynamic(() => import("./program-scene"), { ssr: false, loading: () => null });

let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * "webgl" only on mounted, desktop-sized (≥1024px), fine-pointer devices with WebGL and no
 * reduced-motion preference; otherwise "css". Always "css" during SSR/hydration.
 */
export function useSceneMode(): "webgl" | "css" {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const wide = useMediaQuery("(min-width: 1024px)");
  if (!mounted || reduce || !fine || !wide) return "css";
  return hasWebGL() ? "webgl" : "css";
}

class CanvasBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[scene] WebGL scene failed, using CSS fallback", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type CanvasComponent = React.ComponentType<{ active?: boolean; dark?: boolean; motion?: boolean; className?: string; onReady?: () => void }>;

function LazyScene({
  Canvas,
  Fallback,
  dark,
  className,
  forceFallback,
  label,
}: {
  Canvas: CanvasComponent;
  Fallback: React.ComponentType<{ className?: string }>;
  dark: boolean;
  className?: string;
  forceFallback?: boolean;
  label?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mode = useSceneMode();
  const near = useInView(ref, { margin: "200px 0px 200px 0px" });
  const pageVisible = usePageVisible();
  const [everNear, setEverNear] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  if (near && !everNear) setEverNear(true);

  const useWebGL = mode === "webgl" && !forceFallback;
  const fallback = <Fallback className="absolute inset-0" />;

  return (
    <div ref={ref} className={cn("relative h-full w-full", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {(!useWebGL || !ready) && fallback}
      {useWebGL && everNear && (
        <CanvasBoundary fallback={fallback}>
          <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
            <Canvas active={near && pageVisible} dark={dark} motion onReady={() => setReady(true)} />
          </div>
        </CanvasBoundary>
      )}
    </div>
  );
}

export interface HeroSceneLazyProps {
  /** Sizing/positioning classes for the scene box (it fills its parent by default). */
  className?: string;
  /** Always use the CSS fallback (e.g. on a low-priority page). */
  forceFallback?: boolean;
  /** Accessible description; omit to hide the decorative scene from assistive tech. */
  label?: string;
}

/** Hero 3D scene: lazy WebGL on capable desktops, CSS-3D fallback elsewhere. Theme-aware. */
export function HeroSceneLazy({ className, forceFallback, label }: HeroSceneLazyProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  return <LazyScene Canvas={HeroCanvas} Fallback={HeroSceneFallback} dark={mounted && resolvedTheme === "dark"} className={className} forceFallback={forceFallback} label={label} />;
}

export interface ProgramSceneLazyProps extends HeroSceneLazyProps {
  /** Palette. Default true (designed for the dark-navy program card). Pass "theme" to follow the site theme. */
  dark?: boolean | "theme";
}

/** Program visualisation (laptop/code/circuit/network/database/AI with animated links). */
export function ProgramSceneLazy({ className, forceFallback, label, dark = true }: ProgramSceneLazyProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const isDark = dark === "theme" ? mounted && resolvedTheme === "dark" : dark;
  return <LazyScene Canvas={ProgramCanvas} Fallback={ProgramSceneFallback} dark={isDark} className={className} forceFallback={forceFallback} label={label} />;
}
