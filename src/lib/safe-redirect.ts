/**
 * Same-site redirect guard (open-redirect protection). Safe on client and server.
 *
 * Accepts only a path that stays on this site: it must start with a single "/", contain no
 * backslashes or control characters (browsers strip tabs/newlines and treat "\" like "/", so
 * "/\evil.com" and "/%09/evil.com" would otherwise become "//evil.com"), and must still resolve
 * to the same origin after URL parsing. Anything else returns `fallback`.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2000) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  for (let i = 0; i < next.length; i++) {
    const c = next.charCodeAt(i);
    if (c <= 0x1f || c === 0x7f || c === 0x5c) return fallback; // control characters and "\"
  }
  try {
    const base = "http://same-site.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
