"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { scenePalette } from "./textures";
import { Chip, CircuitPlane, Connection, Database, Floaty, InfoCard, Laptop, Lights, Node, ParallaxRig, Particles } from "./primitives";

type V3 = [number, number, number];

export interface ProgramSceneProps {
  active?: boolean;
  /** The program card is always dark navy, so this defaults to true. */
  dark?: boolean;
  motion?: boolean;
  className?: string;
  /** Called once the WebGL context is created. */
  onReady?: () => void;
}

// Hubs: laptop (code), database, chip (OS/circuit), AI cluster, network nodes.
const LAPTOP: V3 = [-1.6, -0.2, 0.3];
const DB: V3 = [1.7, -0.55, 0.2];
const CHIP: V3 = [0.1, -1.0, 0.9];
const AI_LAYERS: V3[][] = [
  [[-0.2, 1.5, -0.6], [-0.2, 0.95, -0.6], [-0.2, 0.4, -0.6]],
  [[0.6, 1.75, -0.8], [0.6, 1.2, -0.8], [0.6, 0.65, -0.8], [0.6, 0.1, -0.8]],
  [[1.4, 1.35, -0.6], [1.4, 0.75, -0.6]],
];
const NET: V3[] = [[-2.6, 1.3, -1], [-1.5, 1.8, -1.3], [-2.9, 0.4, -0.8]];

/**
 * Raw R3F program visualisation: laptop with code, circuit floor, processor, database stack,
 * a small neural network and network nodes, all linked by lines with travelling data packets.
 * Prefer `ProgramSceneLazy`.
 */
export default function ProgramScene({ active = true, dark = true, motion = true, className, onReady }: ProgramSceneProps) {
  const p = React.useMemo(() => scenePalette(dark), [dark]);

  const edges = React.useMemo(() => {
    const e: { a: V3; b: V3; c: string }[] = [];
    for (let l = 0; l < AI_LAYERS.length - 1; l++)
      for (const a of AI_LAYERS[l]) for (const b of AI_LAYERS[l + 1]) e.push({ a, b, c: p.violet });
    const laptopTop: V3 = [LAPTOP[0] + 0.3, LAPTOP[1] + 0.9, LAPTOP[2]];
    e.push({ a: laptopTop, b: AI_LAYERS[0][1], c: p.cyan });
    e.push({ a: AI_LAYERS[2][1], b: [DB[0], DB[1] + 0.9, DB[2]], c: p.cyan });
    e.push({ a: [LAPTOP[0] + 0.6, LAPTOP[1] - 0.2, LAPTOP[2] + 0.3], b: CHIP, c: p.bright });
    e.push({ a: CHIP, b: [DB[0] - 0.4, DB[1], DB[2]], c: p.bright });
    e.push({ a: NET[0], b: NET[1], c: p.cyan });
    e.push({ a: NET[0], b: NET[2], c: p.cyan });
    e.push({ a: NET[1], b: laptopTop, c: p.cyan });
    e.push({ a: NET[2], b: [LAPTOP[0] - 0.4, LAPTOP[1] + 0.4, LAPTOP[2]], c: p.cyan });
    return e;
  }, [p]);

  return (
    <Canvas
      className={className}
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.6, 8], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      aria-hidden
      onCreated={() => onReady?.()}
    >
      <Lights p={p} dark={dark} />
      <ParallaxRig enabled={motion} strength={0.7}>
        <Floaty position={LAPTOP} rotation={[0.2, 0.45, 0]} amplitude={0.05} speed={0.6} sway={0.03} enabled={motion}>
          <Laptop p={p} scale={0.7} />
        </Floaty>
        <Database p={p} position={DB} scale={0.85} />
        <Chip p={p} position={CHIP} rotation={[0.35, 0.5, 0]} scale={0.7} />
        <Floaty position={[2.6, 1.6, -1.2]} rotation={[0, -0.35, 0]} amplitude={0.1} speed={0.7} phase={1.4} enabled={motion}>
          <InfoCard kind="sql" p={p} width={1.35} />
        </Floaty>
        {AI_LAYERS.flat().map((pos, i) => (
          <Node key={`ai-${i}`} position={pos} color={i % 3 === 0 ? p.cyan : p.violet} p={p} radius={0.11} />
        ))}
        {NET.map((pos, i) => (
          <Node key={`net-${i}`} position={pos} color={p.cyan} p={p} radius={0.13} />
        ))}
        {edges.map((e, i) => (
          <Connection key={i} a={e.a} b={e.b} color={e.c} speed={0.25 + (i % 5) * 0.06} offset={(i * 0.37) % 1} animated={motion} />
        ))}
        <CircuitPlane p={p} position={[0, -1.8, -1]} size={16} animated={motion} />
        <Particles count={140} spread={[10, 5, 5]} color={p.cyan} size={0.06} animated={motion} />
      </ParallaxRig>
    </Canvas>
  );
}
