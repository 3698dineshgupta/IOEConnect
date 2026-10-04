import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function parseRange(v: string | string[] | undefined): RangeKey {
  const s = Array.isArray(v) ? v[0] : v;
  return RANGES.some((r) => r.key === s) ? (s as RangeKey) : "30";
}

const TZ = "Asia/Kathmandu";
const MAX_ROWS = 20000;

function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}

export interface SeriesPoint {
  label: string;
  [series: string]: number | string;
}

/** Start-of-window ISO string (Kathmandu midnight N-1 days ago) or null for all-time. */
function sinceIso(range: RangeKey): string | null {
  const days = RANGES.find((r) => r.key === range)?.days;
  if (!days) return null;
  const todayKey = dayKey(new Date());
  const start = new Date(`${todayKey}T00:00:00+05:45`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString();
}

type Row = Record<string, unknown>;

/** Bucket rows by day (monthly when the span exceeds 120 days). Fills empty buckets. */
function bucketize(
  range: RangeKey,
  since: string | null,
  inputs: { name: string; rows: Row[]; field: string; value?: (r: Row) => number }[],
): SeriesPoint[] {
  const all: Date[] = [];
  for (const i of inputs) for (const r of i.rows) {
    const raw = r[i.field];
    if (typeof raw === "string") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) all.push(d);
    }
  }
  if (!all.length) return [];
  const start = since ? new Date(since) : new Date(Math.min(...all.map((d) => d.getTime())));
  const end = new Date();
  const spanDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const monthly = range === "all" && spanDays > 120;

  const keyOf = (d: Date) => (monthly ? dayKey(d).slice(0, 7) : dayKey(d));
  const buckets = new Map<string, SeriesPoint>();
  const blank = (k: string): SeriesPoint => {
    const p: SeriesPoint = { label: k };
    for (const i of inputs) p[i.name] = 0;
    return p;
  };
  // Pre-fill
  const cursor = new Date(start);
  while (cursor <= end) {
    const k = keyOf(cursor);
    if (!buckets.has(k)) buckets.set(k, blank(k));
    cursor.setUTCDate(cursor.getUTCDate() + (monthly ? 15 : 1));
  }
  buckets.set(keyOf(end), buckets.get(keyOf(end)) ?? blank(keyOf(end)));

  for (const i of inputs) {
    for (const r of i.rows) {
      const raw = r[i.field];
      if (typeof raw !== "string") continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const k = keyOf(d);
      const p = buckets.get(k) ?? blank(k);
      p[i.name] = (p[i.name] as number) + (i.value ? i.value(r) : 1);
      buckets.set(k, p);
    }
  }
  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label)).map((p) => ({
    ...p,
    label: monthly ? p.label : p.label.slice(5), // MM-DD
  }));
}

type Result = PromiseLike<{ data: unknown[] | null; error: unknown }>;
async function rows(q: Result, label: string): Promise<Row[]> {
  const { data, error } = await q;
  if (error) {
    console.error(`[admin/dashboard] ${label} query failed`, error);
    return [];
  }
  return (data ?? []) as Row[];
}

export interface DashboardData {
  stats: {
    totalUsers: number;
    newUsers: number;
    premiumUsers: number;
    pendingPayments: number;
    totalResources: number;
    pdfViews: number;
    studentUploads: number;
    pendingRequests: number;
    revenue: number;
  };
  charts: {
    registrations: SeriesPoint[];
    premium: SeriesPoint[];
    payments: SeriesPoint[];
    views: SeriesPoint[];
    uploads: SeriesPoint[];
  };
  failed: boolean;
}

export async function getDashboardData(range: RangeKey): Promise<DashboardData> {
  const db = createAdminClient();
  const since = sinceIso(range);
  const nowIso = new Date().toISOString();
  let failed = false;

  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: c, error } = await q;
    if (error) {
      failed = true;
      console.error("[admin/dashboard] count failed", error);
    }
    return c ?? 0;
  };
  const ranged = <T,>(q: T, col: string): T => (since ? (q as unknown as { gte: (c: string, v: string) => T }).gte(col, since) : q);

  const head = { count: "exact" as const, head: true };

  const [
    totalUsers,
    newUsers,
    premiumUsers,
    pendingPayments,
    totalResources,
    pdfViews,
    studentUploads,
    pendingRequests,
    approved,
    regRows,
    premRows,
    payRows,
    viewRows,
    upRows,
    resRows,
  ] = await Promise.all([
    count(db.from("profiles").select("id", head)),
    count(ranged(db.from("profiles").select("id", head), "created_at")),
    count(db.from("profiles").select("id", head).eq("is_premium", true).gt("premium_expires_at", nowIso)),
    count(db.from("payments").select("id", head).eq("status", "PENDING")),
    count(db.from("resources").select("id", head).eq("status", "PUBLISHED")),
    count(ranged(db.from("resource_views").select("id", head), "viewed_at")),
    count(ranged(db.from("student_uploads").select("id", head), "created_at")),
    count(db.from("resource_requests").select("id", head).eq("status", "PENDING")),
    rows(ranged(db.from("payments").select("amount").eq("status", "APPROVED"), "created_at").limit(MAX_ROWS), "revenue"),
    rows(ranged(db.from("profiles").select("created_at"), "created_at").limit(MAX_ROWS), "registrations"),
    rows(ranged(db.from("profiles").select("premium_started_at").not("premium_started_at", "is", null), "premium_started_at").limit(MAX_ROWS), "premium"),
    rows(ranged(db.from("payments").select("created_at, amount, status"), "created_at").limit(MAX_ROWS), "payments"),
    rows(ranged(db.from("resource_views").select("viewed_at"), "viewed_at").limit(MAX_ROWS), "views"),
    rows(ranged(db.from("student_uploads").select("created_at"), "created_at").limit(MAX_ROWS), "student uploads"),
    rows(ranged(db.from("resources").select("created_at"), "created_at").limit(MAX_ROWS), "resources"),
  ]);

  const revenue = approved.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return {
    stats: { totalUsers, newUsers, premiumUsers, pendingPayments, totalResources, pdfViews, studentUploads, pendingRequests, revenue },
    charts: {
      registrations: bucketize(range, since, [{ name: "Registrations", rows: regRows, field: "created_at" }]),
      premium: bucketize(range, since, [{ name: "Premium conversions", rows: premRows, field: "premium_started_at" }]),
      payments: bucketize(range, since, [
        { name: "Approved", rows: payRows.filter((r) => r.status === "APPROVED"), field: "created_at", value: (r) => Number(r.amount ?? 0) },
      ]),
      views: bucketize(range, since, [{ name: "Views", rows: viewRows, field: "viewed_at" }]),
      uploads: bucketize(range, since, [
        { name: "Admin uploads", rows: resRows, field: "created_at" },
        { name: "Student uploads", rows: upRows, field: "created_at" },
      ]),
    },
    failed,
  };
}
