// Tiled, faint diagonal watermark as an SVG data URL (CSS background).

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

export function watermarkBackground(text: string, dark = false): string {
  const label = escapeXml(text.slice(0, 80));
  const fill = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.085)";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220" viewBox="0 0 360 220">` +
    `<text x="180" y="110" text-anchor="middle" dominant-baseline="middle" transform="rotate(-28 180 110)" ` +
    `font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="15" font-weight="600" fill="${fill}">${label}</text>` +
    `</svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
