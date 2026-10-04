"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import { MotionConfig } from "motion/react";

/** next-themes (class strategy, no-flash script) + global motion config honouring reduced motion. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem storageKey="ioe-theme" disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemes>
  );
}
