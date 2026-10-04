import { Svg, Path, Circle, Rect, Text as SvgText, G } from "@react-pdf/renderer";
import type { GradesheetSemester } from "./types";
import { fmtGpa } from "./format";

export const C = {
  navy: "#07111F",
  navy2: "#0B1B33",
  blue: "#2563EB",
  cyan: "#22D3EE",
  gold: "#F59E0B",
  paper: "#F8FAFC",
  ink: "#0F172A",
  muted: "#475569",
  faint: "#64748B",
  line: "#E2E8F0",
  zebra: "#F1F5F9",
};

/** The graduation-cap mark, same geometry as components/brand/logo.tsx. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 40 40" width={size} height={size}>
      <Path d="M11 19.5v7.2c0 2.9 4 5.3 9 5.3s9-2.4 9-5.3v-7.2l-9 4.2Z" fill="#2f5fd0" />
      <Path d="M3 15.2 20 23l17-7.8v1.9L20 24.9 3 17.1Z" fill="#1e40af" />
      <Path d="M20 7 37 15.2 20 23 3 15.2Z" fill="#2563eb" />
      <Path d="M20 15.2 31.5 19.8v7.4" fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={31.5} cy={28.4} r={1.7} fill="#22d3ee" />
      <Circle cx={20} cy={15.2} r={1.3} fill="#e0f2fe" />
    </Svg>
  );
}

/** Per-semester SGPA bars drawn with SVG primitives. */
export function SgpaChart({ semesters, maxPoints, width = 523 }: { semesters: GradesheetSemester[]; maxPoints: number; width?: number }) {
  const height = 150;
  const padL = 26;
  const padB = 24;
  const padT = 16;
  const plotW = width - padL - 4;
  const plotH = height - padB - padT;
  const max = maxPoints > 0 ? maxPoints : 4;
  const slot = plotW / Math.max(semesters.length, 1);
  const barW = Math.min(34, slot * 0.56);
  const ticks = [0, max / 2, max];
  const y = (v: number) => padT + plotH - (Math.max(0, Math.min(v, max)) / max) * plotH;
  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {ticks.map((t) => (
        <G key={t}>
          <Rect x={padL} y={y(t)} width={plotW} height={0.6} fill={C.line} />
          <SvgText x={padL - 6} y={y(t) + 2.5} style={{ fontSize: 7 }} fill={C.faint} textAnchor="end">
            {t.toFixed(t % 1 === 0 ? 0 : 1)}
          </SvgText>
        </G>
      ))}
      {semesters.map((s, i) => {
        const cx = padL + slot * i + slot / 2;
        const h = Math.max(plotH - (y(s.sgpa) - padT), 1.5);
        return (
          <G key={s.number}>
            <Rect x={cx - barW / 2} y={padT + plotH - h} width={barW} height={h} rx={2} fill={C.blue} />
            <Rect x={cx - barW / 2} y={padT + plotH - h} width={barW} height={Math.min(3, h)} rx={1.5} fill={C.cyan} />
            <SvgText x={cx} y={padT + plotH - h - 4} style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }} fill={C.ink} textAnchor="middle">
              {fmtGpa(s.sgpa)}
            </SvgText>
            <SvgText x={cx} y={height - 8} style={{ fontSize: 7.5 }} fill={C.muted} textAnchor="middle">
              {`Sem ${s.number}`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
