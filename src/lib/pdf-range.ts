// Pure HTTP Range parsing helpers (no Node/Next imports, unit-testable).

export type RangeResult =
  /** No (usable) Range header: serve the whole body with 200. */
  | { kind: "full" }
  /** Single satisfiable range: serve bytes [start, end] (inclusive) with 206. */
  | { kind: "partial"; start: number; end: number }
  /** Syntactically valid but not satisfiable for this size: 416. */
  | { kind: "unsatisfiable" };

const MAX_HEADER_LENGTH = 200;

/**
 * Parse an HTTP `Range` header for a resource of `size` bytes (RFC 9110 §14).
 *
 * - Only the `bytes` unit and a single range are honoured. Multiple ranges,
 *   unknown units and malformed headers are ignored (=> `full`), which the RFC
 *   allows.
 * - `bytes=a-b`, `bytes=a-` and suffix `bytes=-n` are supported. `end` is
 *   clamped to `size - 1`.
 * - A first-byte-pos beyond the end, or a zero-length suffix, is
 *   `unsatisfiable` (416).
 */
export function parseRangeHeader(header: string | null | undefined, size: number): RangeResult {
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("size must be a non-negative integer");
  if (!header || header.length > MAX_HEADER_LENGTH) return { kind: "full" };

  const match = /^\s*bytes\s*=\s*(.+)$/i.exec(header);
  if (!match) return { kind: "full" };
  const spec = match[1].trim();
  if (spec.includes(",")) return { kind: "full" };

  const m = /^(\d*)\s*-\s*(\d*)$/.exec(spec);
  if (!m) return { kind: "full" };
  const [, a, b] = m;
  if (a === "" && b === "") return { kind: "full" };

  if (a === "") {
    // suffix range: last n bytes
    const n = Number(b);
    if (!Number.isSafeInteger(n)) return { kind: "full" };
    if (n === 0 || size === 0) return { kind: "unsatisfiable" };
    return { kind: "partial", start: Math.max(0, size - n), end: size - 1 };
  }

  const start = Number(a);
  if (!Number.isSafeInteger(start)) return { kind: "full" };
  let end: number;
  if (b === "") {
    end = size - 1;
  } else {
    end = Number(b);
    if (!Number.isSafeInteger(end)) return { kind: "full" };
    if (end < start) return { kind: "full" }; // invalid => ignore header
  }
  if (start >= size) return { kind: "unsatisfiable" };
  return { kind: "partial", start, end: Math.min(end, size - 1) };
}

/** `Content-Range` value for a partial response. */
export function contentRangeHeader(start: number, end: number, size: number): string {
  return `bytes ${start}-${end}/${size}`;
}

/** `Content-Range` value for a 416 response. */
export function unsatisfiedRangeHeader(size: number): string {
  return `bytes */${size}`;
}

/** Parse a `Content-Range: bytes a-b/total` response header (client side). */
export function parseContentRange(value: string | null | undefined): { start: number; end: number; total: number } | null {
  if (!value) return null;
  const m = /^\s*bytes\s+(\d+)-(\d+)\/(\d+)\s*$/i.exec(value);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  const total = Number(m[3]);
  if (![start, end, total].every(Number.isSafeInteger) || end < start || end >= total) return null;
  return { start, end, total };
}
