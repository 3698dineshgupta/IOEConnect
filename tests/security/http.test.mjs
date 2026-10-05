// HTTP-level security regression tests (harmless payloads, run against YOUR OWN server).
//   npm run build && npx next start -p 3100   (production build: headers/CSP match what ships)
//   BASE_URL=http://localhost:3100 npm run test:security
import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const UUID = "0a1b2c3d-0000-4000-8000-000000000000";
const get = (path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init });
const post = (path, init = {}) => fetch(BASE + path, { method: "POST", redirect: "manual", ...init });
const noLeak = (text) => assert.doesNotMatch(text, /(\bat\s+\S+\s+\(|node_modules|\.next\/|stack|ECONN|SUPABASE|service_role|C:\\|\/home\/)/i, "response leaks internals");

test("security headers on pages", async () => {
  const res = await get("/");
  const h = res.headers;
  const csp = h.get("content-security-policy") || "";
  assert.match(csp, /frame-ancestors 'none'/, "clickjacking: frame-ancestors");
  assert.match(csp, /object-src/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*https?:\/\//, "no third-party script origins");
  assert.equal(h.get("x-content-type-options"), "nosniff");
  assert.equal(h.get("x-frame-options"), "DENY");
  assert.ok(h.get("referrer-policy"), "referrer-policy set");
  assert.match(h.get("permissions-policy") || "", /camera=\(\)/);
  assert.ok(h.get("strict-transport-security"), "hsts set");
  assert.equal(h.get("x-powered-by"), null, "framework not advertised");
});

test("protected API endpoints reject unauthenticated callers", async () => {
  assert.equal((await post("/api/scgpa/save", { headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  assert.ok([401, 403].includes((await post("/api/admin/upload", { body: new FormData() })).status), "admin upload");
  assert.equal((await get(`/api/pdf/${UUID}/download`)).status, 401);
  assert.equal((await get("/api/pdf/stream")).status, 401, "stream needs a token");
});

test("CSRF: cross-site requests are rejected before auth", async () => {
  const evil = { origin: "https://evil.example", "sec-fetch-site": "cross-site", "content-type": "application/json" };
  assert.equal((await post("/api/scgpa/save", { headers: evil, body: "{}" })).status, 403);
  assert.equal((await post(`/api/pdf/${UUID}/token`, { headers: evil, body: "{}" })).status, 403);
  assert.equal((await post("/api/admin/upload", { headers: evil, body: new FormData() })).status, 403);
  assert.equal((await get(`/api/pdf/${UUID}/download`, { headers: evil })).status, 403);
});

test("forged / tampered PDF tokens are rejected", async () => {
  const forged = Buffer.from(JSON.stringify({ v: 1, r: UUID, u: null, iat: 1, exp: 9999999999 })).toString("base64url") + ".AAAA";
  for (const t of ["garbage", forged, "a.b.c", "x".repeat(3000)]) {
    const res = await get("/api/pdf/stream", { headers: { "x-pdf-token": t } });
    assert.equal(res.status, 401);
    noLeak(await res.text());
  }
});

test("open redirect on /auth/callback", async () => {
  const bs = String.fromCharCode(92);
  const payloads = ["https://evil.example", "//evil.example", `/${bs}evil.example`, "/%09/evil.example", "/%0a/evil.example", "javascript:alert(1)"];
  for (const p of payloads) {
    const res = await get(`/auth/callback?next=${encodeURIComponent(p)}`);
    const loc = res.headers.get("location") || "";
    // Whatever the destination text, it must resolve to THIS site.
    const dest = new URL(loc, BASE);
    assert.equal(dest.origin, new URL(BASE).origin, `redirected off-site to ${loc} for ${JSON.stringify(p)}`);
    assert.ok(!loc.startsWith("//") && !loc.includes(bs), `suspicious Location ${loc}`);
  }
});

test("CORS: no cross-origin access is granted", async () => {
  for (const path of ["/api/pdf/stream", "/resources/search?q=physics", "/api/scgpa/save"]) {
    const res = await get(path, { headers: { origin: "https://evil.example" } });
    assert.equal(res.headers.get("access-control-allow-origin"), null, path);
    assert.notEqual(res.headers.get("access-control-allow-credentials"), "true", path);
  }
});

test("path traversal / odd identifiers", async () => {
  for (const p of ["/api/pdf/..%2f..%2fetc%2fpasswd/download", "/api/pdf/%2e%2e%2f%2e%2e%2fsecret/token", `/api/pdf/${UUID}%00/download`]) {
    const res = p.endsWith("/token") ? await post(p, { headers: { "content-type": "application/json" }, body: "{}" }) : await get(p);
    assert.ok([400, 401, 404].includes(res.status), `${p} -> ${res.status}`);
    noLeak(await res.text());
  }
});

test("search handles injection payloads safely", async () => {
  const payloads = ["' OR 1=1 --", "%", "_", "\\", "a,b),(c", `"; DROP TABLE subjects; --`, "<script>alert(1)</script>", "x".repeat(500)];
  for (const q of payloads) {
    const res = await get(`/resources/search?q=${encodeURIComponent(q)}`);
    assert.ok([200, 429].includes(res.status), `${q.slice(0, 20)} -> ${res.status}`);
    const text = await res.text();
    noLeak(text);
    assert.doesNotMatch(text, /<script>alert/, "payload must not be echoed as markup");
  }
});

test("reflected XSS: payload in the query string is escaped in HTML", async () => {
  const payload = `"><img src=x onerror=alert(1)><script>alert(2)</script>`;
  for (const path of [`/resources?q=${encodeURIComponent(payload)}`, `/resources/search?q=${encodeURIComponent(payload)}`, `/login?next=${encodeURIComponent(payload)}`]) {
    const res = await get(path);
    const html = await res.text();
    assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/, `${path} reflects raw HTML`);
    assert.doesNotMatch(html, /<script>alert\(2\)<\/script>/, `${path} reflects a script tag`);
  }
});

test("protected pages redirect to login", async () => {
  for (const p of ["/admin", "/admin/users", "/admin/payments", "/dashboard", "/profile", "/payment-history", "/my-uploads"]) {
    const res = await get(p);
    assert.ok([302, 303, 307, 308].includes(res.status), `${p} -> ${res.status}`);
    assert.match(res.headers.get("location") || "", /\/login/, p);
  }
});

test("no source maps or debug files exposed", async () => {
  const html = await (await get("/")).text();
  const chunk = (html.match(/\/_next\/static\/[^"' ]+\.js/) || [])[0];
  assert.ok(chunk, "found a script chunk");
  assert.equal((await get(chunk + ".map")).status, 404, "source map not served");
  for (const p of ["/.env", "/.env.local", "/.git/config", "/package.json", "/next.config.ts", "/supabase/seed.sql"]) {
    const res = await get(p);
    assert.equal(res.status, 404, p);
  }
});

test("error pages do not leak internals", async () => {
  for (const p of ["/subject/does-not-exist", "/view/not-a-uuid", "/resources/nope/year-9/semester-9"]) {
    const res = await get(p);
    assert.ok([200, 404].includes(res.status), `${p} -> ${res.status}`);
    noLeak(await res.text());
  }
});
