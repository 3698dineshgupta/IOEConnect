// Pure-logic security regression tests. Run: npm run test:security
import test from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "../../src/lib/safe-redirect.ts";
import { DEFAULT_GRADE_BANDS, evaluateSubject, normalizeBands } from "../../src/lib/scgpa.ts";

test("open redirect: external and smuggled destinations fall back", () => {
  const bad = [
    "https://evil.example",
    "//evil.example",
    "/" + String.fromCharCode(92) + "evil.example", // browsers read a backslash as "/"
    "/\t/evil.example", // tabs/newlines are stripped by browsers -> "//evil.example"
    "/\n/evil.example",
    "/%09/evil.example".replace("%09", "\t"),
    "javascript:alert(1)",
    "evil.example",
    "",
    "/" + "a".repeat(2100),
  ];
  for (const b of bad) assert.equal(safeRedirectPath(b), "/dashboard", JSON.stringify(b));
  assert.equal(safeRedirectPath(null), "/dashboard");
  assert.equal(safeRedirectPath(undefined, "/x"), "/x");
});

test("open redirect: normal same-site paths are kept", () => {
  assert.equal(safeRedirectPath("/premium"), "/premium");
  assert.equal(safeRedirectPath("/subject/c-programming?tab=notes#top"), "/subject/c-programming?tab=notes#top");
  assert.equal(safeRedirectPath("/view/0a1b2c3d-0000-4000-8000-000000000000"), "/view/0a1b2c3d-0000-4000-8000-000000000000");
});

test("SCGPA: server-authoritative rules (20% cap, 40% pass, official bands)", () => {
  const bands = normalizeBands(DEFAULT_GRADE_BANDS);
  const physics = (t: number, i: number, p: number) =>
    evaluateSubject(
      { slug: "p", fullMarks: 125, obtained: null, credits: 4, parts: { max: { theory: 60, internal: 40, practical: 25 }, theory: t, internal: i, practical: p } },
      bands,
    )!;
  const a = physics(18, 38, 20);
  assert.equal(a.parts!.internal, 20, "internal is capped at theory% + 20%");
  assert.equal(a.grade, "F");
  assert.equal(physics(60, 40, 25).grade, "A");
  assert.equal(physics(24, 16, 10).passed, true, "exact 40% limits pass");
  assert.equal(physics(23.9, 40, 25).grade, "F", "below 40% in theory fails");
  // out-of-range / partial input never produces a result
  assert.equal(physics(61, 20, 20) ?? null, null);
});
