"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { scenePalette } from "./textures";
import { BookStack, CircuitPlane, Floaty, GradCap, InfoCard, Laptop, Lights, ParallaxRig, Particles } from "./primitives";

export interface HeroSceneProps {
  /** Render loop runs only while true (pass false when off-screen / tab hidden). Default true. */
  active?: boolean;
  /** Dark palette (brighter emissives, glowing particles). */
  dark?: boolean;
  /** Ambient floating + pointer parallax. Default true. */
  motion?: boolean;
  className?: string;
  /** Called once the WebGL context is created. */
  onReady?: () => void;
}

/**
 * Raw R3F hero canvas: floating books, laptop, graduation cap, formula/code/PDF cards,
 * circuit-board floor and particles with pointer parallax. Prefer `HeroSceneLazy`, which
 * handles lazy loading, visibility pausing, theme and fallbacks.
 */
export default function HeroScene({ active = true, dark = false, motion = true, className, onReady }: HeroSceneProps) {
  const p = React.useMemo(() => scenePalette(dark), [dark]);
  return (
    <Canvas
      className={className}
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.9, 8.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      aria-hidden
      onCreated={() => onReady?.()}
    >
      <Lights p={p} dark={dark} />
      <ParallaxRig enabled={motion}>
        <group position={[0, -0.1, 0]}>
          <Floaty position={[0.1, -0.35, 0]} rotation={[0.18, -0.55, 0]} amplitude={0.06} speed={0.6} sway={0.03} enabled={motion}>
            <Laptop p={p} scale={0.92} />
          </Floaty>
          <Floaty position={[-2.05, -0.85, 0.9]} rotation={[0.1, 0.55, 0.04]} amplitude={0.1} speed={0.7} phase={1.2} enabled={motion}>
            <group scale={0.78}>
              <BookStack p={p} />
            </group>
          </Floaty>
          <Floaty position={[1.75, 1.35, -0.3]} rotation={[0.35, 0.4, -0.12]} amplitude={0.14} speed={0.8} phase={2.4} enabled={motion}>
            <GradCap p={p} scale={0.85} />
          </Floaty>
          <Floaty position={[-1.85, 1.15, -0.6]} rotation={[0, 0.38, 0.02]} amplitude={0.12} speed={0.65} phase={0.6} enabled={motion}>
            <InfoCard kind="formula" p={p} width={1.75} />
          </Floaty>
          <Floaty position={[2.25, -0.25, 0.7]} rotation={[0, -0.42, -0.02]} amplitude={0.1} speed={0.75} phase={3.1} enabled={motion}>
            <InfoCard kind="code" p={p} width={1.6} />
          </Floaty>
          <Floaty position={[-0.15, 1.75, -1.4]} rotation={[0.05, 0.05, 0]} amplitude={0.09} speed={0.55} phase={4.2} enabled={motion}>
            <InfoCard kind="pdf" p={p} width={1.45} />
          </Floaty>
        </group>
        <CircuitPlane p={p} position={[0, -1.7, -1]} size={16} animated={motion} />
        <Particles count={dark ? 240 : 160} spread={[10, 5, 6]} color={dark ? p.cyan : p.bright} size={dark ? 0.07 : 0.05} animated={motion} />
      </ParallaxRig>
    </Canvas>
  );
}
