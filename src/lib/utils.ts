import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Human-readable byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / Math.pow(1024, i);
  return `${i === 0 ? value : value.toFixed(decimals).replace(/\.0+$/, "")} ${units[i]}`;
}

/**
 * Format a date for display, e.g. "3 Oct 2026".
 * Pass `{ withTime: true }` to include hours/minutes.
 */
export function formatDate(
  d: string | number | Date | null | undefined,
  opts: { withTime?: boolean } = {},
): string {
  if (d == null || d === "") return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(opts.withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Kathmandu",
  }).format(date);
}

/** URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Absolute site URL for links/metadata. */
export function siteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
