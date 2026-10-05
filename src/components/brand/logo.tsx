import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Compact mark: a dimensional graduation cap (lit top face, shaded edge, cap body) in
 * electric blue → cyan with a soft glow. Works on light and dark backgrounds.
 * Server-safe (uses only useId).
 */
export function LogoMark({ className, glow = true }: { className?: string; glow?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  const top = `${id}-top`;
  const body = `${id}-body`;
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="IOE Connect"
      className={cn("size-8 shrink-0", glow && "drop-shadow-[0_3px_10px_rgb(37_99_235/0.35)]", className)}
    >
      <defs>
        <linearGradient id={top} x1="6" y1="8" x2="34" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id={body} x1="12" y1="20" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b1628" />
        </linearGradient>
      </defs>
      {/* cap body */}
      <path d="M11 19.5v7.2c0 2.9 4 5.3 9 5.3s9-2.4 9-5.3v-7.2l-9 4.2Z" fill={`url(#${body})`} />
      <path d="M11 26.7c0 2.9 4 5.3 9 5.3s9-2.4 9-5.3" fill="none" stroke="#60a5fa" strokeOpacity=".55" strokeWidth=".9" />
      {/* board: shaded front edge, then lit top face */}
      <path d="M3 15.2 20 23l17-7.8v1.9L20 24.9 3 17.1Z" fill="#1e40af" />
      <path d="M20 7 37 15.2 20 23 3 15.2Z" fill={`url(#${top})`} />
      <path d="M20 7 37 15.2 20 23 3 15.2Z" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth=".7" />
      {/* tassel */}
      <path d="M20 15.2 31.5 19.8v7.4" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="31.5" cy="28.4" r="1.7" fill="#22d3ee" />
      <circle cx="20" cy="15.2" r="1.3" fill="#e0f2fe" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const inner = (
    <>
      <LogoMark />
      {showWordmark && (
        <span className="text-[1.0625rem] font-extrabold leading-none tracking-[-0.03em]">
          <span className="text-foreground">ioe</span>
          <span className="text-primary">connect</span>
        </span>
      )}
    </>
  );
  const cls = cn("inline-flex items-center gap-2", className);
  if (href === null) return <span className={cls}>{inner}</span>;
  return (
    <Link href={href} className={cn(cls, "min-h-10 rounded-md")} aria-label="ioeconnect home">
      {inner}
    </Link>
  );
}
