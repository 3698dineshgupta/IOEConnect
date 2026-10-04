import "server-only";

import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";

/** Real, DB-derived numbers for the landing page. Every field is a count; 0 means "hide it". */
export interface HomeStats {
  subjects: number;
  resources: number;
  byType: { syllabus: number; notes: number; pyq: number };
  /** Subjects having at least one published resource of the type. */
  coverage: { syllabus: number; notes: number; pyq: number };
}

export const EMPTY_STATS: HomeStats = {
  subjects: 0,
  resources: 0,
  byType: { syllabus: 0, notes: 0, pyq: 0 },
  coverage: { syllabus: 0, notes: 0, pyq: 0 },
};

type Row = { subject_id: string; resource_type: string };

async function fetchPublished(): Promise<Row[]> {
  const sb = createStaticClient();
  const size = 1000;
  const out: Row[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await sb
      .from("public_resources")
      .select("subject_id, resource_type")
      .order("id")
      .range(page * size, (page + 1) * size - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

const cachedStats = unstable_cache(
  async (): Promise<HomeStats> => {
    const sb = createStaticClient();
    const [{ count: subjectCount, error }, rows] = await Promise.all([
      sb.from("subjects").select("id", { count: "exact", head: true }),
      fetchPublished(),
    ]);
    if (error) throw error;
    const subjects = subjectCount ?? 0;
    const sets = { syllabus: new Set<string>(), notes: new Set<string>(), pyq: new Set<string>() };
    const byType = { syllabus: 0, notes: 0, pyq: 0 };
    for (const r of rows) {
      const k = r.resource_type === "SYLLABUS" ? "syllabus" : r.resource_type === "NOTES" ? "notes" : r.resource_type === "PYQ" ? "pyq" : null;
      if (!k) continue;
      byType[k]++;
      sets[k].add(r.subject_id);
    }
    const cap = (n: number) => (subjects > 0 ? Math.min(n, subjects) : 0);
    return {
      subjects,
      resources: rows.length,
      byType,
      coverage: { syllabus: cap(sets.syllabus.size), notes: cap(sets.notes.size), pyq: cap(sets.pyq.size) },
    };
  },
  ["home:stats"],
  { tags: ["curriculum", "resources"], revalidate: 600 },
);

/** Never throws: any failure (no env, missing view, RLS) yields empty stats so sections hide. */
export async function getHomeStats(): Promise<HomeStats> {
  try {
    return await cachedStats();
  } catch (err) {
    console.error("[home] stats failed", err);
    return EMPTY_STATS;
  }
}
