import { cn } from "@/lib/utils";

/*
 * Lightweight CSS-3D / SVG versions of the WebGL scenes. No hooks, no JS: safe in server
 * components, and used by the lazy wrappers on touch / small screens / reduced motion /
 * no-WebGL and while the canvas chunk loads. Ambient float is CSS and stops under reduced motion.
 */

function FloatCard({ className, style, children, delay = "0s" }: { className?: string; style?: React.CSSProperties; children: React.ReactNode; delay?: string }) {
  return (
    // outer: placement + static 3D rotation; inner: CSS float animation (both use transform)
    <div className={cn("absolute", className)} style={style}>
      <div className="h-full rounded-xl border border-border bg-surface-elevated/95 p-3 shadow-lg animate-float" style={{ animationDelay: delay }}>
        {children}
      </div>
    </div>
  );
}

export function HeroSceneFallback({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-full w-full select-none overflow-hidden perspective-[1100px]", className)}>
      <div className="glow-blob left-1/4 top-1/4 size-2/3" />
      <div className="glow-blob glow-blob-cyan bottom-0 right-0 size-1/2" />

      {/* circuit floor */}
      <div
        className="absolute inset-x-[-20%] bottom-[-18%] h-[70%] bg-grid-blueprint opacity-80"
        style={{ transform: "rotateX(64deg)", transformOrigin: "50% 100%", maskImage: "radial-gradient(ellipse 60% 70% at 50% 30%, #000 20%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 30%, #000 20%, transparent 80%)" }}
      >
        <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none">
          <g fill="none" stroke="var(--primary)" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round">
            <path d="M40 40h80l20 20h90" />
            <path d="M260 30v50h70" />
            <path d="M60 150h60l30-30h100l20 20h70" />
            <path d="M200 60v60" />
          </g>
          <g fill="var(--cyan-bright)" fillOpacity="0.7">
            <circle cx="230" cy="60" r="3" />
            <circle cx="330" cy="80" r="3" />
            <circle cx="340" cy="140" r="3" />
            <circle cx="200" cy="120" r="3" />
          </g>
        </svg>
      </div>

      {/* laptop */}
      <div className="absolute left-1/2 top-[54%] w-[52%]" style={{ transform: "translate(-50%,-50%) rotateX(8deg) rotateY(-14deg)", transformStyle: "preserve-3d" }}>
        <div className="aspect-16/10 rounded-t-xl border border-white/10 bg-[#0b1628] p-[5%] shadow-xl">
          <div className="flex h-full flex-col gap-[7%] rounded-md bg-linear-to-br from-[#0f1d33] to-[#07111f] p-[6%]">
            {[
              ["w-1/3 bg-violet-bright", "w-1/4 bg-[#60a5fa]"],
              ["w-1/2 bg-[#22d3ee]", "w-1/6 bg-slate-400"],
              ["w-1/4 bg-[#60a5fa]", "w-1/3 bg-amber-400"],
              ["w-2/5 bg-slate-300", ""],
              ["w-1/5 bg-violet-bright", "w-1/3 bg-[#22d3ee]"],
            ].map((row, i) => (
              <div key={i} className="flex gap-[4%]" style={{ paddingLeft: i % 2 ? "8%" : 0 }}>
                {row.filter(Boolean).map((c) => (
                  <span key={c} className={cn("h-1.5 rounded-full opacity-85", c)} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-[-6%] h-3 rounded-b-xl bg-linear-to-b from-slate-300 to-slate-400 shadow-lg dark:from-slate-500 dark:to-slate-600" />
      </div>

      {/* books */}
      <div className="absolute bottom-[14%] left-[6%] w-[24%] animate-float" style={{ animationDelay: "-1.5s" }}>
        <div className="ml-[6%] h-3.5 w-[88%] rounded-sm bg-cyan-bright shadow-md" />
        <div className="ml-[2%] mt-0.5 h-4 w-[94%] rounded-sm bg-primary-strong shadow-md" />
        <div className="mt-0.5 h-4 w-full rounded-sm bg-brand-navy shadow-lg ring-1 ring-white/10" />
      </div>

      {/* graduation cap */}
      <svg viewBox="0 0 120 90" className="absolute right-[8%] top-[8%] w-[22%] animate-float drop-shadow-xl" style={{ animationDelay: "-3s" }}>
        <path d="M60 8 114 30 60 52 6 30Z" fill="#0b1628" stroke="#3b82f6" strokeOpacity=".5" />
        <path d="M30 41v20c0 8 14 14 30 14s30-6 30-14V41L60 53Z" fill="#1e3a8a" />
        <path d="M60 30 100 40v24" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="m96 64 4 12 4-12Z" fill="#f59e0b" />
      </svg>

      {/* floating cards */}
      <FloatCard className="left-[4%] top-[10%] w-[34%]" delay="-0.5s" style={{ transform: "rotateY(14deg)" }}>
        <p className="text-[10px] font-semibold text-muted-foreground">Engineering Mathematics</p>
        <p className="mt-1 font-serif text-lg text-foreground sm:text-xl">∫ eˣ sin x dx</p>
        <p className="font-serif text-sm text-primary">∇ · E = ρ / ε₀</p>
      </FloatCard>
      <FloatCard className="right-[3%] top-[48%] w-[34%]" delay="-2.2s" style={{ transform: "rotateY(-16deg)" }}>
        <p className="font-mono text-[10px] leading-relaxed sm:text-xs">
          <span className="text-violet">for</span> (i = 0; i &lt; n; i++)
          <br />
          <span className="pl-3 text-cyan">sum</span> += a[i];
        </p>
      </FloatCard>
      <FloatCard className="left-[36%] top-[3%] w-[30%]" delay="-4s">
        <span className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-red-500 text-[9px] font-extrabold text-white">PDF</span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-semibold">Past questions</span>
            <span className="mt-1 block h-1 w-4/5 rounded-full bg-primary-soft" />
          </span>
        </span>
      </FloatCard>

      {/* particles */}
      {[
        [12, 62], [22, 30], [48, 20], [70, 30], [86, 70], [62, 84], [30, 86], [92, 40], [8, 44], [56, 46],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute size-1 rounded-full bg-cyan-bright shadow-[0_0_8px_2px_var(--glow-cyan)] animate-pulse-glow"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 0.37}s` }}
        />
      ))}
    </div>
  );
}

/** Network/AI/database diagram drawn in SVG with flowing dashed connections. Designed for dark navy panels. */
export function ProgramSceneFallback({ className }: { className?: string }) {
  const nodes = {
    laptop: [90, 150],
    net1: [40, 70],
    net2: [110, 40],
    ai1: [200, 60],
    ai2: [200, 110],
    ai3: [260, 45],
    ai4: [260, 95],
    ai5: [260, 145],
    ai6: [320, 80],
    ai7: [320, 130],
    chip: [190, 200],
    db: [340, 205],
  } as const;
  type K = keyof typeof nodes;
  const edges: [K, K][] = [
    ["net1", "net2"], ["net1", "laptop"], ["net2", "laptop"], ["laptop", "ai2"], ["laptop", "chip"],
    ["ai1", "ai3"], ["ai1", "ai4"], ["ai2", "ai4"], ["ai2", "ai5"], ["ai1", "ai5"], ["ai2", "ai3"],
    ["ai3", "ai6"], ["ai4", "ai6"], ["ai4", "ai7"], ["ai5", "ai7"], ["ai7", "db"], ["chip", "db"],
  ];
  return (
    <div aria-hidden className={cn("relative h-full w-full overflow-hidden", className)}>
      <div className="absolute inset-0 bg-grid opacity-60 [--grid-line:rgb(255_255_255/0.05)]" />
      <div className="glow-blob left-1/3 top-1/4 size-2/3" />
      <svg viewBox="0 0 400 260" className="relative h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="psf-node" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#e0f2fe" />
            <stop offset=".4" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#2563eb" />
          </radialGradient>
        </defs>
        <g fill="none" strokeWidth="1.4">
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a][0]}
              y1={nodes[a][1]}
              x2={nodes[b][0]}
              y2={nodes[b][1]}
              stroke={a.startsWith("ai") && b.startsWith("ai") ? "#8b5cf6" : "#22d3ee"}
              strokeOpacity=".7"
              className="animate-flow"
              style={{ animationDelay: `${-i * 0.23}s` }}
            />
          ))}
        </g>
        {/* laptop */}
        <g transform="translate(58 128)">
          <rect width="64" height="40" rx="4" fill="#0f1d33" stroke="#3b82f6" strokeOpacity=".6" />
          <rect x="6" y="8" width="22" height="3" rx="1.5" fill="#8b5cf6" />
          <rect x="10" y="16" width="34" height="3" rx="1.5" fill="#22d3ee" />
          <rect x="10" y="24" width="18" height="3" rx="1.5" fill="#60a5fa" />
          <path d="M-6 42h76l-6 6H0Z" fill="#94a3b8" />
        </g>
        {/* chip */}
        <g transform="translate(172 182)">
          <rect width="36" height="36" rx="5" fill="#0b1628" stroke="#f59e0b" strokeOpacity=".7" />
          <rect x="10" y="10" width="16" height="16" rx="2" fill="#3b82f6" />
          {[6, 14, 22, 30].map((o) => (
            <g key={o} stroke="#f59e0b" strokeWidth="1.5">
              <line x1={o} y1="-4" x2={o} y2="0" />
              <line x1={o} y1="36" x2={o} y2="40" />
              <line x1="-4" y1={o} x2="0" y2={o} />
              <line x1="36" y1={o} x2="40" y2={o} />
            </g>
          ))}
        </g>
        {/* database */}
        <g transform="translate(322 180)">
          {[0, 14, 28].map((y) => (
            <g key={y} transform={`translate(0 ${24 - y})`}>
              <path d="M0 6v10c0 3.3 8 6 18 6s18-2.7 18-6V6" fill="#1d4ed8" />
              <ellipse cx="18" cy="6" rx="18" ry="6" fill="#3b82f6" stroke="#22d3ee" strokeOpacity=".6" />
            </g>
          ))}
        </g>
        {(["net1", "net2", "ai1", "ai2", "ai3", "ai4", "ai5", "ai6", "ai7"] as K[]).map((k, i) => (
          <circle key={k} cx={nodes[k][0]} cy={nodes[k][1]} r={k.startsWith("net") ? 7 : 6} fill="url(#psf-node)" className="animate-pulse-glow" style={{ animationDelay: `${-i * 0.4}s` }} />
        ))}
      </svg>
    </div>
  );
}
