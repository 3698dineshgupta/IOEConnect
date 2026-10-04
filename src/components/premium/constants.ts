// Client-safe constants shared by the premium UI and the payment server actions.

export const PAYMENT_SCREENSHOT_BUCKET = "payment-screenshots";

/** Matches the `payment-screenshots` bucket's allowed_mime_types / file_size_limit. */
export const SCREENSHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

export const SCREENSHOT_EXT_BY_MIME: Record<(typeof SCREENSHOT_MIME_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** `<uid>/<uuid>.<ext>` */
export const SCREENSHOT_PATH_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

export type ActionResult<T = null> = { ok: true; data: T; message?: string } | { ok: false; error: string };

export function formatMoney(amount: number | string | null | undefined, currency: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || !Number.isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
  return `${currency} ${formatted}`;
}

/** An enabled payment method as shown to the user (QR already resolved to a URL). */
export interface PaymentMethodView {
  id: string;
  label: string;
  account_name: string;
  account_id: string;
  bank_name?: string;
  qrUrl: string | null;
}
