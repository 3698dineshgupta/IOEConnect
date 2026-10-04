import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { searchCatalogLabeled } from "@/components/resources/data";

export const dynamic = "force-dynamic";

// Best-effort in-memory limiter (per server instance): 30 requests / minute / client.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();
// Dedupe search_events: same client + same query within 5 minutes is recorded once.
const recent = new Map<string, number>();
const DEDUPE_MS = 5 * 60_000;

function prune(now: number) {
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t > WINDOW_MS)) hits.delete(k);
  if (recent.size > 5000) for (const [k, t] of recent) if (now - t > DEDUPE_MS) recent.delete(k);
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [] });

  const user = await getSessionUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const client = user?.id ?? `ip:${ip}`;

  const now = Date.now();
  prune(now);
  const stamps = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_REQUESTS) {
    return NextResponse.json({ results: [], error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  stamps.push(now);
  hits.set(client, stamps);

  const results = await searchCatalogLabeled(q, 8);

  // Record the search (3+ chars, deduped). Failures never affect the response.
  const key = `${client}:${q.toLowerCase()}`;
  if (q.length >= 3 && now - (recent.get(key) ?? 0) > DEDUPE_MS) {
    recent.set(key, now);
    try {
      const supabase = await createServerClient();
      const { error } = await supabase.from("search_events").insert({ user_id: user?.id ?? null, query: q });
      if (error) console.error("[search] search_events insert failed", error);
    } catch (err) {
      console.error("[search] search_events insert failed", err);
    }
  }

  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
