/** Shared motion constants. Import anywhere (no "use client" needed). */

export const easings = {
  out: [0.22, 1, 0.36, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const springs = {
  /** UI controls: buttons, toggles, magnet */
  snappy: { type: "spring", stiffness: 420, damping: 30, mass: 0.6 } as const,
  /** Cards, tilt, layout shifts */
  soft: { type: "spring", stiffness: 220, damping: 26, mass: 0.8 } as const,
  /** Accordions / height */
  gentle: { type: "spring", stiffness: 260, damping: 32, mass: 0.9 } as const,
};

export const durations = {
  fast: 0.15,
  base: 0.22,
  slow: 0.6,
  reveal: 0.7,
};
