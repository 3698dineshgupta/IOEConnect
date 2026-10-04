"use client";

import * as THREE from "three";

/** Scene palette per theme. Kept in sync with globals.css brand tokens. */
export function scenePalette(dark: boolean) {
  return dark
    ? {
        navy: "#0b1628",
        midnight: "#0f1d33",
        blue: "#2563eb",
        bright: "#3b82f6",
        cyan: "#22d3ee",
        violet: "#8b5cf6",
        gold: "#f59e0b",
        paper: "#e2e8f0",
        ink: "#f8fafc",
        inkSoft: "#94a3b8",
        cardBg: "rgba(15,29,51,0.92)",
        cardBorder: "rgba(96,165,250,0.45)",
        trace: "rgba(56,189,248,0.55)",
        traceSoft: "rgba(59,130,246,0.18)",
        emissive: 0.55,
        ambient: 0.35,
      }
    : {
        navy: "#0b1628",
        midnight: "#1e3a8a",
        blue: "#2563eb",
        bright: "#3b82f6",
        cyan: "#06b6d4",
        violet: "#7c3aed",
        gold: "#f59e0b",
        paper: "#f8fafc",
        ink: "#07111f",
        inkSoft: "#526075",
        cardBg: "rgba(255,255,255,0.96)",
        cardBorder: "rgba(37,99,235,0.28)",
        trace: "rgba(37,99,235,0.42)",
        traceSoft: "rgba(37,99,235,0.10)",
        emissive: 0.15,
        ambient: 0.75,
      };
}
export type ScenePalette = ReturnType<typeof scenePalette>;

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function toTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function cardBase(p: ScenePalette, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  roundRect(ctx, 4, 4, w - 8, h - 8, 28);
  ctx.fillStyle = p.cardBg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = p.cardBorder;
  ctx.stroke();
  return { c, ctx };
}

export type CardKind = "formula" | "code" | "pdf" | "sql" | "ai";

/** Floating info card texture (512×320). Text drawn with system fonts; nothing is downloaded. */
export function cardTexture(kind: CardKind, p: ScenePalette) {
  const W = 512;
  const H = 320;
  const { c, ctx } = cardBase(p, W, H);
  const dot = (x: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, 40, 7, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.textBaseline = "middle";
  if (kind === "formula") {
    ctx.fillStyle = p.inkSoft;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText("Engineering Mathematics", 36, 48);
    ctx.fillStyle = p.ink;
    ctx.font = `500 54px ${"Cambria Math, 'Times New Roman', serif"}`;
    ctx.fillText("∫ eˣ sin x dx", 36, 140);
    ctx.fillStyle = p.bright;
    ctx.font = `500 40px ${"Cambria Math, 'Times New Roman', serif"}`;
    ctx.fillText("∇ · E = ρ / ε₀", 36, 225);
    ctx.fillStyle = p.traceSoft;
    ctx.fillRect(36, 270, 300, 6);
  } else if (kind === "code" || kind === "sql") {
    dot(44, "#f87171");
    dot(68, "#fbbf24");
    dot(92, "#34d399");
    const lines =
      kind === "code"
        ? [
            [p.violet, "int ", p.ink, "main() {"],
            [p.inkSoft, "  // C programming", "", ""],
            [p.bright, "  for ", p.ink, "(i = 0; i < n; i++)"],
            [p.cyan, "    sum ", p.ink, "+= a[i];"],
            [p.violet, "  return ", p.ink, "0; }"],
          ]
        : [
            [p.violet, "SELECT ", p.ink, "name, code"],
            [p.violet, "FROM ", p.ink, "subjects"],
            [p.violet, "WHERE ", p.ink, "semester = 4"],
            [p.violet, "ORDER BY ", p.ink, "name;"],
          ];
    ctx.font = `500 26px ${MONO}`;
    lines.forEach(([c1, t1, c2, t2], i) => {
      const y = 100 + i * 42;
      ctx.fillStyle = c1;
      ctx.fillText(t1, 36, y);
      const w = ctx.measureText(t1).width;
      ctx.fillStyle = c2 || p.ink;
      ctx.fillText(t2, 36 + w, y);
    });
  } else if (kind === "pdf") {
    roundRect(ctx, 36, 36, 92, 116, 14);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 30px ${SANS}`;
    ctx.fillText("PDF", 52, 96);
    ctx.fillStyle = p.ink;
    ctx.font = `700 28px ${SANS}`;
    ctx.fillText("Past questions", 152, 70);
    ctx.fillStyle = p.inkSoft;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText("Year-wise papers", 152, 112);
    ctx.fillStyle = p.traceSoft;
    for (let i = 0; i < 3; i++) ctx.fillRect(36, 190 + i * 30, i === 2 ? 260 : 440, 12);
  } else {
    ctx.fillStyle = p.inkSoft;
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText("Neural network", 36, 48);
    const layers = [3, 4, 2];
    const pts: [number, number][][] = layers.map((n, li) =>
      Array.from({ length: n }, (_, i) => [90 + li * 165, 110 + (i - (n - 1) / 2) * 52 + 60] as [number, number]),
    );
    ctx.strokeStyle = p.trace;
    ctx.lineWidth = 2;
    for (let l = 0; l < pts.length - 1; l++)
      for (const a of pts[l]) for (const b of pts[l + 1]) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    pts.flat().forEach(([x, y], i) => {
      ctx.fillStyle = i % 3 === 0 ? p.cyan : p.bright;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return toTexture(c);
}

/** Laptop screen texture: a dark editor with syntax-coloured lines. */
export function screenTexture(p: ScenePalette) {
  const W = 512;
  const H = 320;
  const { c, ctx } = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0b1628");
  g.addColorStop(1, "#07111f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, 96, H);
  ctx.fillRect(0, 0, W, 28);
  const palette = [p.violet, "#60a5fa", "#22d3ee", "#94a3b8", "#fbbf24", "#e2e8f0"];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 12; i++) {
    const y = 48 + i * 22;
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.fillRect(20, y, 18, 8);
    let x = 112 + (i % 4 === 0 ? 0 : (i % 3) * 20);
    const parts = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < parts; k++) {
      const w = 30 + rnd() * 110;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, y, w, 9);
      x += w + 12;
    }
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

/** Circuit-board texture: traces, vias and pads on a transparent background (tileable-ish). */
export function circuitTexture(p: ScenePalette, size = 1024) {
  const { c, ctx } = makeCanvas(size, size);
  const step = size / 16;
  ctx.strokeStyle = p.traceSoft;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  let seed = 42;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.strokeStyle = p.trace;
  ctx.fillStyle = p.trace;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let t = 0; t < 34; t++) {
    let x = Math.floor(rnd() * 16) * step;
    let y = Math.floor(rnd() * 16) * step;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 2 + Math.floor(rnd() * 3);
    for (let s = 0; s < segs; s++) {
      const len = (1 + Math.floor(rnd() * 3)) * step;
      const dir = Math.floor(rnd() * 4);
      if (dir === 0) x += len;
      else if (dir === 1) x -= len;
      else if (dir === 2) y += len;
      else {
        x += len;
        y += len; // 45° jog
      }
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // a couple of chips
  for (let k = 0; k < 3; k++) {
    const x = (3 + k * 5) * step;
    const y = (4 + ((k * 7) % 9)) * step;
    ctx.fillStyle = p.traceSoft;
    roundRect(ctx, x, y, step * 2, step * 1.4, 8);
    ctx.fill();
    ctx.strokeStyle = p.trace;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Small round sprite for particles (soft dot). */
export function dotTexture() {
  const { c, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(c);
}
