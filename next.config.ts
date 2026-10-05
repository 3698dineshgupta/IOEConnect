import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Host of the Supabase project (REST, auth, storage, realtime) so the CSP can allow exactly that origin. */
function supabaseHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy tuned to what the app really loads:
 *  - scripts/styles: same origin plus the inline bootstrap/styles Next.js and the page components emit
 *    ('unsafe-inline'); pdf.js needs WebAssembly ('wasm-unsafe-eval') and a blob/same-origin worker.
 *  - images: same origin, data:/blob: (previews) and the Supabase storage host (avatars, merch, QR codes).
 *  - connect: same origin and Supabase only. Telegram / iLovePDF are called from the server, never the browser.
 *  - frames: the print flow loads the PDF blob in a hidden iframe; nothing else may be framed or embed us.
 * In development React Refresh needs 'unsafe-eval' and a websocket, so those are added only there.
 */
function contentSecurityPolicy(): string {
  const sb = supabaseHost();
  const sbHttp = sb ? ` https://${sb}` : "";
  const sbWs = sb ? ` wss://${sb}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${sbHttp}`,
    "font-src 'self' data:",
    `connect-src 'self'${sbHttp}${sbWs}${isProd ? "" : " ws: wss:"}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

/**
 * Duplicate-content guard. Once NEXT_PUBLIC_SITE_URL points at the real domain (e.g. https://www.ioeconnect.com),
 * the project's own *.vercel.app production hostname 308-redirects there, so only one host is indexed.
 * Preview deployments (other hostnames) are not touched. With the env var unset or still on vercel.app, nothing redirects.
 */
function canonicalHostRedirects() {
  try {
    const target = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
    // The project's own production hostname on vercel.app (override with LEGACY_VERCEL_HOST if it ever changes).
    const vercelHost = process.env.LEGACY_VERCEL_HOST || "ioeconnect.vercel.app";
    if (!target || target.host === vercelHost || target.hostname.endsWith(".vercel.app")) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: vercelHost }],
        destination: `${target.origin}/:path*`,
        permanent: true,
      },
    ];
  } catch {
    return [];
  }
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: frame-ancestors above is the modern control; this covers old browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  experimental: {
    // The proxy (formerly middleware) buffers request bodies; the admin PDF
    // upload route needs more than the 10 MB default.
    proxyClientMaxBodySize: "60mb",
  },
  async redirects() {
    return canonicalHostRedirects();
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
