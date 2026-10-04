"use client";

/* Procedural low-poly building blocks shared by HeroScene and ProgramScene. No external assets. */

import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { cardTexture, circuitTexture, dotTexture, screenTexture, type CardKind, type ScenePalette } from "./textures";

type V3 = [number, number, number];

/** Dispose a three.js resource when it changes or the component unmounts. */
export function useDispose(value: { dispose: () => void }) {
  React.useEffect(() => () => value.dispose(), [value]);
}

/** Window-level pointer position normalised to [-1, 1]; read inside useFrame (no re-renders). */
export function useWindowPointer() {
  const ref = React.useRef({ x: 0, y: 0 });
  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ref.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ref.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return ref;
}

/** Group that eases its rotation/position toward the pointer (damped). */
export function ParallaxRig({ children, strength = 1, enabled = true }: { children: React.ReactNode; strength?: number; enabled?: boolean }) {
  const group = React.useRef<THREE.Group>(null);
  const pointer = useWindowPointer();
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const tx = enabled ? pointer.current.x : 0;
    const ty = enabled ? pointer.current.y : 0;
    const d = Math.min(dt, 0.05);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, tx * 0.28 * strength, 3, d);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, ty * 0.14 * strength, 3, d);
    g.position.x = THREE.MathUtils.damp(g.position.x, tx * 0.25 * strength, 2.5, d);
    g.position.y = THREE.MathUtils.damp(g.position.y, -ty * 0.15 * strength, 2.5, d);
  });
  return <group ref={group}>{children}</group>;
}

/** Gentle ambient bob + sway. */
export function Floaty({
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  amplitude = 0.12,
  speed = 0.8,
  sway = 0.08,
  phase = 0,
  enabled = true,
}: {
  children: React.ReactNode;
  position?: V3;
  rotation?: V3;
  amplitude?: number;
  speed?: number;
  sway?: number;
  phase?: number;
  enabled?: boolean;
}) {
  const ref = React.useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || !enabled) return;
    const t = clock.elapsedTime * speed + phase;
    g.position.y = position[1] + Math.sin(t) * amplitude;
    g.rotation.x = rotation[0] + Math.cos(t * 0.9) * sway * 0.5;
    g.rotation.z = rotation[2] + Math.sin(t * 0.7) * sway * 0.6;
    g.rotation.y = rotation[1] + Math.sin(t * 0.5) * sway;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

export function Lights({ p, dark }: { p: ScenePalette; dark: boolean }) {
  return (
    <>
      <ambientLight intensity={p.ambient} />
      <hemisphereLight args={[dark ? "#3b82f6" : "#ffffff", dark ? "#050b14" : "#cbd5e1", dark ? 0.5 : 0.6]} />
      <directionalLight position={[4, 6, 5]} intensity={dark ? 1.2 : 1.6} />
      <pointLight position={[-3, 2, 3]} intensity={dark ? 18 : 8} distance={12} color={p.bright} />
      <pointLight position={[3, -1, 2]} intensity={dark ? 12 : 5} distance={10} color={p.cyan} />
    </>
  );
}

export function Book({ color, p, size = [1.5, 0.22, 1.05], position, rotation }: { color: string; p: ScenePalette; size?: V3; position?: V3; rotation?: V3 }) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[w, h, d]} radius={0.03} smoothness={2}>
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {/* page block, inset on three sides */}
      <mesh position={[0.04, 0, 0]}>
        <boxGeometry args={[w - 0.06, h * 0.72, d - 0.08]} />
        <meshStandardMaterial color={p.paper} roughness={0.9} />
      </mesh>
      {/* spine band */}
      <mesh position={[-w / 2 + 0.01, 0, 0]}>
        <boxGeometry args={[0.025, h * 0.4, d * 0.98]} />
        <meshStandardMaterial color={p.gold} roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

export function BookStack({ p, position, rotation }: { p: ScenePalette; position?: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Book p={p} color={p.navy} position={[0, 0, 0]} />
      <Book p={p} color={p.blue} position={[0.05, 0.24, -0.02]} rotation={[0, 0.18, 0]} size={[1.4, 0.2, 1]} />
      <Book p={p} color={p.cyan} position={[-0.04, 0.46, 0.02]} rotation={[0, -0.12, 0]} size={[1.3, 0.18, 0.95]} />
    </group>
  );
}

export function Laptop({ p, position, rotation, scale = 1 }: { p: ScenePalette; position?: V3; rotation?: V3; scale?: number }) {
  const screen = React.useMemo(() => screenTexture(p), [p]);
  useDispose(screen);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[2.2, 0.09, 1.5]} radius={0.04} smoothness={2}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.35} metalness={0.6} />
      </RoundedBox>
      {/* keyboard area */}
      <mesh position={[0, 0.047, 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 0.75]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* hinge + lid */}
      <group position={[0, 0.045, -0.74]} rotation={[-0.32, 0, 0]}>
        <RoundedBox args={[2.2, 1.45, 0.06]} radius={0.04} smoothness={2} position={[0, 0.72, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.6} />
        </RoundedBox>
        <mesh position={[0, 0.74, 0.032]}>
          <planeGeometry args={[2.02, 1.27]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function GradCap({ p, position, rotation, scale = 1 }: { p: ScenePalette; position?: V3; rotation?: V3; scale?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* board */}
      <mesh rotation={[0, Math.PI / 4, 0]} position={[0, 0.32, 0]}>
        <boxGeometry args={[1.35, 0.06, 1.35]} />
        <meshStandardMaterial color={p.navy} roughness={0.5} metalness={0.15} />
      </mesh>
      {/* skull cap (low-poly frustum) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.46, 0.52, 0.4, 8, 1, true]} />
        <meshStandardMaterial color={p.midnight} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* button */}
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 12]} />
        <meshStandardMaterial color={p.gold} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* tassel cord + end */}
      <mesh position={[0.46, 0.34, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.92, 0.015, 0.015]} />
        <meshStandardMaterial color={p.gold} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.92, 0.12, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 6]} />
        <meshStandardMaterial color={p.gold} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.92, -0.14, 0]}>
        <coneGeometry args={[0.07, 0.18, 8]} />
        <meshStandardMaterial color={p.gold} emissive={p.gold} emissiveIntensity={0.25} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Flat info card with a canvas-drawn face. */
export function InfoCard({ kind, p, width = 1.6, position, rotation }: { kind: CardKind; p: ScenePalette; width?: number; position?: V3; rotation?: V3 }) {
  const tex = React.useMemo(() => cardTexture(kind, p), [kind, p]);
  useDispose(tex);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width * 0.625]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** Circuit-board ground plane; traces scroll slowly when `animated`. */
export function CircuitPlane({ p, size = 14, position = [0, -1.6, 0], animated = true }: { p: ScenePalette; size?: number; position?: V3; animated?: boolean }) {
  const tex = React.useMemo(() => {
    const t = circuitTexture(p);
    t.repeat.set(2, 2);
    return t;
  }, [p]);
  useDispose(tex);
  const mat = React.useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    const m = mat.current?.map;
    if (animated && m) m.offset.y -= dt * 0.01;
  });
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Soft glowing particles in a box volume. */
export function Particles({ count = 220, spread = [9, 5, 5], color, size = 0.06, animated = true }: { count?: number; spread?: V3; color: string; size?: number; animated?: boolean }) {
  const ref = React.useRef<THREE.Points>(null);
  const [sx, sy, sz] = spread;
  const geom = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * sx;
      pos[i * 3 + 1] = (rnd() - 0.5) * sy;
      pos[i * 3 + 2] = (rnd() - 0.5) * sz;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, sx, sy, sz]);
  useDispose(geom);
  const sprite = React.useMemo(() => dotTexture(), []);
  useDispose(sprite);
  useFrame((_, dt) => {
    if (animated && ref.current) ref.current.rotation.y += dt * 0.02;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={size}
        map={sprite}
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/** Stack of database cylinders. */
export function Database({ p, position, scale = 1 }: { p: ScenePalette; position?: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, i * 0.34, 0]}>
          <mesh>
            <cylinderGeometry args={[0.45, 0.45, 0.28, 20]} />
            <meshStandardMaterial color={i === 2 ? p.bright : p.blue} roughness={0.35} metalness={0.3} emissive={p.blue} emissiveIntensity={p.emissive * 0.6} />
          </mesh>
          <mesh position={[0, 0.141, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.33, 24]} />
            <meshBasicMaterial color={p.cyan} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Glowing node sphere (icosahedron, low-poly). */
export function Node({ position, color, radius = 0.14, p }: { position: V3; color: string; radius?: number; p: ScenePalette }) {
  return (
    <mesh position={position}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4 + p.emissive} roughness={0.3} flatShading />
    </mesh>
  );
}

/** Straight connection line plus a travelling "packet" that loops from a → b. */
export function Connection({ a, b, color, speed = 0.35, offset = 0, animated = true }: { a: V3; b: V3; color: string; speed?: number; offset?: number; animated?: boolean }) {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;
  const va = React.useMemo(() => new THREE.Vector3(ax, ay, az), [ax, ay, az]);
  const vb = React.useMemo(() => new THREE.Vector3(bx, by, bz), [bx, by, bz]);
  const line = React.useMemo(() => new THREE.BufferGeometry().setFromPoints([va, vb]), [va, vb]);
  useDispose(line);
  const packet = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = packet.current;
    if (!m) return;
    const t = animated ? (clock.elapsedTime * speed + offset) % 1 : 0.5;
    m.position.lerpVectors(va, vb, t);
    const s = Math.sin(t * Math.PI);
    m.scale.setScalar(0.4 + s * 0.8);
  });
  return (
    <group>
      <lineSegments geometry={line}>
        <lineBasicMaterial color={color} transparent opacity={0.45} toneMapped={false} />
      </lineSegments>
      <mesh ref={packet}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Low-poly processor chip with pins. */
export function Chip({ p, position, rotation, scale = 1 }: { p: ScenePalette; position?: V3; rotation?: V3; scale?: number }) {
  const pins = React.useMemo(() => {
    const out: { pos: V3; size: V3 }[] = [];
    const alongZ: V3 = [0.06, 0.04, 0.14];
    const alongX: V3 = [0.14, 0.04, 0.06];
    for (let i = 0; i < 5; i++) {
      const o = -0.4 + i * 0.2;
      out.push(
        { pos: [o, 0, 0.62], size: alongZ },
        { pos: [o, 0, -0.62], size: alongZ },
        { pos: [0.62, 0, o], size: alongX },
        { pos: [-0.62, 0, o], size: alongX },
      );
    }
    return out;
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <RoundedBox args={[1.1, 0.14, 1.1]} radius={0.04} smoothness={2}>
        <meshStandardMaterial color={p.navy} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial color={p.bright} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {pins.map(({ pos, size }, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={size} />
          <meshStandardMaterial color={p.gold} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
