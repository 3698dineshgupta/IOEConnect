// Pure zoom/fit math for the viewer. No DOM access, so it can be unit-tested in Node.
//
// Units: a "zoom" of 1 means 100%: one PDF point is drawn at 96/72 CSS px, the size the
// page would have printed on paper. pdf.js wants a viewport scale, which is zoom * CSS_UNITS.

export const CSS_UNITS = 96 / 72;

/** Manual zoom range (25% to 300%). */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
/** Fit modes may go below MIN_ZOOM for huge-format pages, but never below this. */
const FIT_FLOOR = 0.05;

/** Widest a page is drawn in fit-width mode on desktop, in CSS px. Wider gets hard to read. */
export const MAX_FIT_CSS_WIDTH = 1040;

/** Presets offered in the zoom menu. */
export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Ladder used by the zoom in / zoom out buttons and keys. */
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Horizontal stage padding per side, in CSS px. Pages go edge to edge on phones. */
export function stagePadX(containerWidth: number): number {
  if (containerWidth < 640) return 8;
  if (containerWidth < 1024) return 20;
  return 40;
}
/** Vertical padding used by fit-page (room for the floating toolbar at the bottom). */
export const STAGE_PAD_TOP = 24;
export const STAGE_PAD_BOTTOM = 96;

export const clampZoom = (z: number) => Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) * 1000) / 1000;
const clampFit = (z: number) => Math.round(Math.min(MAX_ZOOM, Math.max(FIT_FLOOR, z)) * 1000) / 1000;

/**
 * Zoom that makes a page `pageWidthPt` wide fill the container, capped at `maxCssWidth`.
 * Returns null while the container has not been measured (width 0), so callers can wait
 * instead of fitting into nothing.
 */
export function fitWidthZoom(
  containerWidth: number,
  pageWidthPt: number,
  maxCssWidth = MAX_FIT_CSS_WIDTH,
  padX = stagePadX(containerWidth),
): number | null {
  if (!(containerWidth > 0) || !(pageWidthPt > 0)) return null;
  const avail = containerWidth - padX * 2;
  if (avail <= 0) return null;
  return clampFit(Math.min(avail, maxCssWidth) / (pageWidthPt * CSS_UNITS));
}

/** Zoom that shows a whole page inside the container. Null until measured. */
export function fitPageZoom(
  containerWidth: number,
  containerHeight: number,
  pageWidthPt: number,
  pageHeightPt: number,
): number | null {
  const byWidth = fitWidthZoom(containerWidth, pageWidthPt, Number.POSITIVE_INFINITY);
  if (byWidth == null || !(containerHeight > 0) || !(pageHeightPt > 0)) return null;
  const availH = containerHeight - STAGE_PAD_TOP - STAGE_PAD_BOTTOM;
  if (availH <= 0) return byWidth;
  return clampFit(Math.min(byWidth, availH / (pageHeightPt * CSS_UNITS)));
}

/** Next zoom step in `dir` (+1 in, -1 out) from `z`, skipping steps within 2% of `z`. */
export function stepZoom(z: number, dir: 1 | -1): number {
  if (dir > 0) {
    const next = ZOOM_STEPS.find((s) => s > z * 1.02);
    return clampZoom(next ?? MAX_ZOOM);
  }
  const prev = [...ZOOM_STEPS].reverse().find((s) => s < z / 1.02);
  return clampZoom(prev ?? MIN_ZOOM);
}

/** Percentage shown in the toolbar. */
export const zoomPercent = (z: number) => Math.round(z * 100);

/** Backing-store scale for a canvas: device pixel ratio capped at 2, then capped by total pixels. */
export function outputScale(dpr: number, cssWidth: number, cssHeight: number, maxPixels: number): number {
  let s = Math.min(Math.max(1, Number.isFinite(dpr) ? dpr : 1), 2);
  const px = cssWidth * cssHeight * s * s;
  if (px > maxPixels && cssWidth > 0 && cssHeight > 0) s = Math.sqrt(maxPixels / (cssWidth * cssHeight));
  return s;
}
