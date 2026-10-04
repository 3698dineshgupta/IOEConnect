import * as React from "react";
import { cn } from "@/lib/utils";
import { subjectIconKind, type SubjectIconKind } from "./subject-kind";

export { subjectIconKind, SUBJECT_ICON_KINDS, type SubjectIconKind } from "./subject-kind";

const TONES: Record<SubjectIconKind, { main: string; accent: string; label: string }> = {
  programming: { main: "var(--primary)", accent: "var(--cyan-bright)", label: "Programming" },
  mathematics: { main: "var(--violet-bright)", accent: "var(--primary)", label: "Mathematics" },
  networks: { main: "var(--cyan)", accent: "var(--primary)", label: "Networks" },
  database: { main: "var(--primary)", accent: "var(--cyan-bright)", label: "Database" },
  ai: { main: "var(--violet-bright)", accent: "var(--cyan-bright)", label: "Artificial intelligence" },
  os: { main: "var(--primary)", accent: "var(--gold)", label: "Operating systems" },
  electronics: { main: "var(--cyan)", accent: "var(--gold)", label: "Electronics" },
  physics: { main: "var(--primary)", accent: "var(--violet-bright)", label: "Physics" },
  chemistry: { main: "var(--cyan)", accent: "var(--violet-bright)", label: "Chemistry" },
  generic: { main: "var(--primary)", accent: "var(--cyan-bright)", label: "Subject" },
};

type Anim = { bob: string; spin: string; spinRev: string; pulse: string; flow: string };

function Glyph({ kind, a, main, accent }: { kind: SubjectIconKind; a: Anim; main: string; accent: string }) {
  const soft = `color-mix(in srgb, ${main} 18%, transparent)`;
  const mid = `color-mix(in srgb, ${main} 45%, transparent)`;
  switch (kind) {
    case "programming":
      return (
        <g className={a.bob}>
          <path d="M24 8 38 16v16L24 40 10 32V16Z" fill={soft} stroke={main} />
          <path d="M10 16l14 8 14-8M24 24v16" stroke={main} fill="none" />
          <path d="M24 8 38 16 24 24 10 16Z" fill={mid} stroke="none" />
          <path d="m15.5 27.5-2.5 2 2.5 2M20 26l-2 7.5" stroke={accent} fill="none" strokeWidth="1.8" />
        </g>
      );
    case "mathematics":
      return (
        <g>
          <circle cx="24" cy="24" r="13" fill={soft} stroke={main} />
          <ellipse cx="24" cy="24" rx="13" ry="5" fill="none" stroke={mid} />
          <ellipse cx="24" cy="24" rx="5.5" ry="13" fill="none" stroke={mid} className={a.spin} />
          <ellipse cx="24" cy="24" rx="19" ry="6" fill="none" stroke={accent} strokeDasharray="2 3" transform="rotate(-24 24 24)" className={a.spinRev} />
          <circle cx="19" cy="19" r="2.5" fill={main} opacity=".55" />
        </g>
      );
    case "networks": {
      const n: [number, number][] = [[24, 12], [11, 22], [37, 22], [16, 37], [32, 37]];
      const e: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2], [0, 3]];
      return (
        <g>
          {e.map(([i, j], k) => (
            <line key={k} x1={n[i][0]} y1={n[i][1]} x2={n[j][0]} y2={n[j][1]} stroke={k % 2 ? mid : accent} className={a.flow} />
          ))}
          {n.map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={k === 0 ? 4.5 : 3.5} fill={k === 0 ? main : soft} stroke={main} className={k === 0 ? a.pulse : undefined} />
          ))}
        </g>
      );
    }
    case "database":
      return (
        <g className={a.bob}>
          {[26, 18, 10].map((y, i) => (
            <g key={y}>
              <path d={`M12 ${y + 4}v7c0 2.2 5.4 4 12 4s12-1.8 12-4v-7`} fill={i === 2 ? mid : soft} stroke={main} />
              <ellipse cx="24" cy={y + 4} rx="12" ry="4" fill={i === 2 ? mid : soft} stroke={main} />
            </g>
          ))}
          <ellipse cx="24" cy="14" rx="7" ry="2" fill="none" stroke={accent} className={a.pulse} />
        </g>
      );
    case "ai": {
      const L = [[12, [14, 24, 34]], [24, [10, 19, 29, 38]], [36, [18, 30]]] as const;
      const lines: React.ReactNode[] = [];
      for (let l = 0; l < 2; l++)
        for (const y1 of L[l][1]) for (const y2 of L[l + 1][1]) lines.push(<line key={`${l}${y1}${y2}`} x1={L[l][0]} y1={y1} x2={L[l + 1][0]} y2={y2} stroke={mid} strokeWidth="1" />);
      let k = 0;
      return (
        <g>
          {lines}
          {L.map(([x, ys]) =>
            ys.map((y) => {
              const i = k++;
              return <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" fill={i % 3 === 0 ? accent : main} className={a.pulse} style={{ animationDelay: `${-i * 0.35}s` }} />;
            }),
          )}
        </g>
      );
    }
    case "os":
      return (
        <g>
          {[16, 21, 27, 32].map((o) => (
            <g key={o} stroke={accent} strokeWidth="1.6">
              <line x1={o} y1="7" x2={o} y2="12" />
              <line x1={o} y1="36" x2={o} y2="41" />
              <line x1="7" y1={o} x2="12" y2={o} />
              <line x1="36" y1={o} x2="41" y2={o} />
            </g>
          ))}
          <rect x="12" y="12" width="24" height="24" rx="4" fill={soft} stroke={main} />
          <rect x="18" y="18" width="12" height="12" rx="2" fill={main} className={a.pulse} />
        </g>
      );
    case "electronics":
      return (
        <g>
          <path d="M6 24h8l2-5 3 10 3-10 3 10 3-10 2 5h4" fill="none" stroke={main} strokeWidth="1.8" />
          <path d="M14 24v12h20V24M24 36v6M10 12h12v8M38 24V12H28" fill="none" stroke={accent} className={a.flow} />
          {[[10, 12], [24, 42], [38, 12], [34, 36]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={soft} stroke={main} />
          ))}
        </g>
      );
    case "physics":
      return (
        <g>
          {[0, 60, 120].map((r) => (
            <ellipse key={r} cx="24" cy="24" rx="16" ry="6" fill="none" stroke={mid} transform={`rotate(${r} 24 24)`} />
          ))}
          <g className={a.spin}>
            <circle cx="24" cy="24" r="16" fill="none" stroke="none" />
            <circle cx="40" cy="24" r="2.2" fill={accent} />
          </g>
          <circle cx="24" cy="24" r="4" fill={main} className={a.pulse} />
        </g>
      );
    case "chemistry":
      return (
        <g className={a.bob}>
          <path d="M24 13 33.5 18.5v11L24 35 14.5 29.5v-11Z" fill={soft} stroke={main} />
          <path d="M24 17.5 29.8 21M18.2 21v6.6" stroke={mid} fill="none" />
          <path d="M33.5 18.5 40 14M14.5 29.5 8 34M24 35v6" stroke={main} fill="none" />
          <circle cx="40" cy="14" r="3.2" fill={accent} />
          <circle cx="8" cy="34" r="3.2" fill={main} />
          <circle cx="24" cy="41" r="2.6" fill={accent} className={a.pulse} />
        </g>
      );
    default:
      return (
        <g className={a.bob}>
          <path d="M24 9 37 16.5v15L24 39 11 31.5v-15Z" fill={soft} stroke={main} />
          <path d="M24 9 37 16.5 24 24 11 16.5Z" fill={mid} stroke="none" />
          <path d="M11 16.5 24 24l13-7.5M24 24v15" stroke={main} fill="none" />
          <circle cx="24" cy="24" r="1.8" fill={accent} className={a.pulse} />
        </g>
      );
  }
}

export interface SubjectIconProps {
  /** Icon kind; when omitted it is derived from `slug`/`name` via `subjectIconKind`. */
  kind?: SubjectIconKind;
  slug?: string | null;
  name?: string | null;
  /** Pixel size of the square. Default 48. */
  size?: number;
  className?: string;
  /** true (default): gentle loop; "hover": only while the icon or a parent `.group` is hovered; false: static. */
  animated?: boolean | "hover";
  /** Render inside a soft tinted rounded tile. Default true. */
  tile?: boolean;
  /** Accessible name. Omit for decorative use (aria-hidden). */
  title?: string;
}

/**
 * Abstract animated SVG icon per subject category. Pure SVG + CSS (no hooks, server-safe,
 * no WebGL). Motion stops under prefers-reduced-motion via globals.css.
 */
export function SubjectIcon({ kind, slug, name, size = 48, className, animated = true, tile = true, title }: SubjectIconProps) {
  const k = kind ?? subjectIconKind(slug, name);
  const tone = TONES[k];
  const on = animated !== false;
  const a: Anim = on
    ? { bob: "si-bob", spin: "si-spin", spinRev: "si-spin-rev", pulse: "si-pulse", flow: "si-flow" }
    : { bob: "", spin: "", spinRev: "", pulse: "", flow: "" };
  const svg = (
    <svg
      viewBox="0 0 48 48"
      width={tile ? "72%" : size}
      height={tile ? "72%" : size}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("overflow-visible", animated === "hover" && "si-hover", !tile && className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-kind={k}
    >
      <Glyph kind={k} a={a} main={tone.main} accent={tone.accent} />
    </svg>
  );
  if (!tile) return svg;
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl border", className)}
      style={{
        width: size,
        height: size,
        borderColor: `color-mix(in srgb, ${tone.main} 22%, var(--border))`,
        background: `radial-gradient(120% 120% at 30% 15%, color-mix(in srgb, ${tone.main} 16%, transparent), color-mix(in srgb, ${tone.accent} 6%, transparent) 70%)`,
      }}
    >
      {svg}
    </span>
  );
}
