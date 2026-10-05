// SEO regression tests against a PRODUCTION build served with the real domain:
//   NEXT_PUBLIC_SITE_URL=https://www.ioeconnect.com npm run build && npx next start -p 3100
//   BASE_URL=http://localhost:3100 SITE_URL=https://www.ioeconnect.com npm run test:seo
import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SITE = (process.env.SITE_URL || "https://www.ioeconnect.com").replace(/\/+$/, "");
const html = async (path) => (await fetch(BASE + path, { redirect: "manual" })).text();
const pick = (h, re) => (h.match(re) || [])[1]?.replace(/&amp;/g, "&").trim();
const meta = (h) => ({
  title: pick(h, /<title>([\s\S]*?)<\/title>/),
  desc: pick(h, /<meta name="description" content="([^"]*)"/),
  canonical: pick(h, /<link rel="canonical" href="([^"]*)"/),
  robots: pick(h, /<meta name="robots" content="([^"]*)"/),
  h1: [...h.matchAll(/<h1\b/g)].length,
  ld: [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])),
});
const types = (ld) => ld.flatMap((x) => [].concat(x["@graph"] || x).map((n) => n["@type"]));

const INDEXABLE = ["/", "/resources", "/resources/cse", "/resources/cse/year-1", "/resources/cse/year-1/semester-1", "/subject/engineering-physics", "/calculator", "/faq", "/about", "/contact", "/privacy", "/terms"];

test("every indexable page: one title, a description, a self canonical on the real domain, one h1", async () => {
  for (const path of INDEXABLE) {
    const m = meta(await html(path));
    assert.ok(m.title && m.title.length >= 15 && m.title.length <= 75, `${path} title: ${m.title}`);
    assert.ok(!/IOE Connect \| IOE Connect/.test(m.title), `${path} doubled brand suffix`);
    assert.ok(m.desc && m.desc.length >= 70 && m.desc.length <= 160, `${path} description length ${m.desc?.length}`);
    const want = path === "/" ? SITE : SITE + path;
    assert.equal((m.canonical || "").replace(/\/$/, ""), want.replace(/\/$/, ""), `${path} canonical`);
    assert.ok(!/noindex/i.test(m.robots || ""), `${path} must be indexable`);
    assert.equal(m.h1, 1, `${path} h1 count`);
  }
});

test("account / utility pages are noindex", async () => {
  for (const path of ["/login", "/register", "/reset-password", "/report-bug"]) {
    assert.match(meta(await html(path)).robots || "", /noindex/, path);
  }
});

test("the same subject in different programs has distinct titles", async () => {
  const slugs = [
    "engineering-physics", "ce-engineering-physics", "ex-engineering-physics", "el-engineering-physics", "me-engineering-physics",
    // long names must keep their program/semester suffix
    "ex-fundamentals-of-thermodynamics-and-heat-transfer", "el-fundamentals-of-thermodynamics-and-heat-transfer", "me-fundamentals-of-thermodynamics-and-heat-transfer", "ce-fundamentals-of-thermodynamics-and-heat-transfer",
  ];
  const titles = [];
  for (const s of slugs) {
    const m = meta(await html(`/subject/${s}`));
    if (m.title) titles.push(m.title);
  }
  assert.ok(titles.length >= 3, "found several programs' pages");
  assert.equal(new Set(titles).size, titles.length, `duplicate titles: ${titles.join(" | ")}`);
});

test("structured data is valid JSON with the right types", async () => {
  const home = types(meta(await html("/")).ld);
  for (const t of ["Organization", "WebSite", "FAQPage"]) assert.ok(home.includes(t), `home has ${t}`);
  assert.ok(types(meta(await html("/faq")).ld).includes("FAQPage"));
  assert.ok(types(meta(await html("/calculator")).ld).includes("WebApplication"));
  const crumbs = meta(await html("/subject/engineering-physics")).ld.find((x) => x["@type"] === "BreadcrumbList");
  assert.ok(crumbs && crumbs.itemListElement.length >= 4, "subject breadcrumbs");
  assert.ok(crumbs.itemListElement[0].item.startsWith(SITE), "breadcrumb URLs use the real domain");
});

test("FAQ schema matches the visible FAQ (no hidden questions)", async () => {
  const h = await html("/faq");
  const faq = meta(h).ld.flatMap((x) => [].concat(x["@graph"] || x)).find((n) => n["@type"] === "FAQPage");
  for (const q of faq.mainEntity) assert.ok(h.includes(q.name.replace(/&/g, "&amp;")) || h.includes(q.name), `question not visible: ${q.name}`);
});

test("robots.txt and sitemap point at the real domain and list only public pages", async () => {
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  assert.match(robots, new RegExp(`Sitemap: ${SITE.replace(/[.]/g, "\.")}/sitemap\.xml`));
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Disallow: \/api/);
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 100, "sitemap has the catalogue");
  assert.ok(locs.every((u) => u.startsWith(SITE + "/") || u === SITE), "all sitemap URLs on the real domain");
  assert.ok(!locs.some((u) => /\/(admin|api|view|dashboard|login|register)(\/|$)/.test(u)), "no private URLs in the sitemap");
  assert.equal(new Set(locs).size, locs.length, "no duplicate sitemap URLs");
  for (const p of ["/privacy", "/terms", "/faq", "/calculator"]) assert.ok(locs.includes(SITE + p), `${p} in sitemap`);
});

test("social cards: every page has a share image and a card type", async () => {
  for (const path of ["/", "/subject/engineering-physics", "/resources/cse", "/resources/cse/year-1/semester-1"]) {
    const h = await html(path);
    assert.match(h, /<meta property="og:image" content="[^"]+"/, `${path} og:image`);
    assert.match(h, /<meta name="twitter:card" content="[^"]+"/, `${path} twitter:card`);
  }
});

test("the duplicate *.vercel.app host redirects to the real domain", async () => {
  // fetch() forbids overriding Host, so use the plain HTTP client.
  const { request } = await import("node:http");
  const url = new URL(BASE + "/subject/engineering-physics?x=1");
  const res = await new Promise((resolve, reject) => {
    const r = request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { host: "ioeconnect.vercel.app" } }, resolve);
    r.on("error", reject);
    r.end();
  });
  assert.equal(res.statusCode, 308);
  assert.equal(res.headers.location, `${SITE}/subject/engineering-physics?x=1`);
  res.resume();
});

test("missing pages return a real 404 (no soft 404s), for browsers and for crawlers", async () => {
  const uas = ["Mozilla/5.0 Chrome/120", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"];
  for (const ua of uas) {
    for (const p of ["/subject/does-not-exist", "/resources/nope", "/resources/cse/year-9/semester-9", "/totally-missing-page"]) {
      const res = await fetch(BASE + p, { redirect: "manual", headers: { "user-agent": ua } });
      assert.equal(res.status, 404, `${p} (${ua.slice(0, 20)}) -> ${res.status}`);
    }
  }
});
