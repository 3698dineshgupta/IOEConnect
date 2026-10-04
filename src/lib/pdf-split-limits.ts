/**
 * Size limits for auto-splitting big PDFs (no pdf-lib import, so UI code can use them cheaply).
 * Telegram bot storage can only serve files up to 20 MB.
 */
const MiB = 1024 * 1024;

/** Files larger than this are split before upload. */
export const SPLIT_ABOVE = 19 * MiB;
/** Upper bound for one part (a margin under Telegram's 20 MB download limit). */
export const MAX_PART = 18 * MiB;

/** Rough number of parts a file of `size` bytes will be split into (for UI notes). */
export function estimateParts(size: number, maxBytes = MAX_PART): number {
  return Math.max(1, Math.ceil(size / maxBytes));
}
