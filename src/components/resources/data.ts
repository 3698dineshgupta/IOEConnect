import "server-only";

import { getPrograms, getSubjectResources } from "@/lib/curriculum";
import { createServerClient } from "@/lib/supabase/server";
import type { PublicResourceView, SearchResult } from "@/lib/types";
import { splitPartTitle, toRoman, yearRange } from "./format";

/** Published resources for many subjects, keyed by subject id. */
export async function getResourcesBySubject(subjectIds: string[]): Promise<Map<string, PublicResourceView[]>> {
  const entries = await Promise.all(subjectIds.map(async (id) => [id, await getSubjectResources(id)] as const));
  return new Map(entries);
}

export type BrowseType = "PYQ" | "NOTES" | "SYLLABUS";
export const BROWSE_TYPES: readonly BrowseType[] = ["PYQ", "NOTES", "SYLLABUS"];

export function parseBrowseType(v: string | undefined): BrowseType | undefined {
  const t = (v ?? "").toUpperCase();
  return (BROWSE_TYPES as readonly string[]).includes(t) ? (t as BrowseType) : undefined;
}

/** Strip characters that have meaning in PostgREST filter syntax before building an ilike. */
function filterTerm(q: string): string {
  return q
    .replace(/[^\p{L}\p{N}\s.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Published resources of one type (optionally matching a title/subject term), newest first, paginated. */
export async function listResourcesByType(
  type: BrowseType,
  opts: { q?: string; page: number; pageSize: number },
): Promise<{ rows: PublicResourceView[]; total: number }> {
  try {
    const supabase = await createServerClient();
    let query = supabase.from("public_resources").select("*", { count: "exact" }).eq("resource_type", type);
    const term = filterTerm(opts.q ?? "");
    if (term.length >= 2) {
      query = query.or(`title.ilike.%${term}%,subject_name.ilike.%${term}%,subject_code.ilike.%${term}%`);
    }
    const from = (opts.page - 1) * opts.pageSize;
    const { data, count, error } = await query.order("updated_at", { ascending: false }).range(from, from + opts.pageSize - 1);
    if (error) throw error;
    return { rows: (data ?? []) as PublicResourceView[], total: count ?? 0 };
  } catch (err) {
    console.error("[resources] listResourcesByType failed", err);
    return { rows: [], total: 0 };
  }
}

/** Real published counts per browse type (null when the count could not be read). */
export async function countPublishedByType(): Promise<Record<BrowseType, number | null>> {
  const supabase = await createServerClient();
  const entries = await Promise.all(
    BROWSE_TYPES.map(async (t) => {
      try {
        const { count, error } = await supabase.from("public_resources").select("id", { count: "exact", head: true }).eq("resource_type", t);
        if (error) throw error;
        return [t, count ?? 0] as const;
      } catch (err) {
        console.error("[resources] count failed", { t, err });
        return [t, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<BrowseType, number | null>;
}

export interface SearchHit {
  key: string;
  kind: SearchResult["kind"];
  title: string;
  label: string;
  href: string;
  premium: boolean;
}

/** rpc('search_catalog') with human labels like "Operating System — Semester VI — Notes / PYQ 2018–2025". */
export async function searchCatalogLabeled(q: string, limit = 8): Promise<SearchHit[]> {
  const term = q.trim().slice(0, 100);
  if (term.length < 2) return [];
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc("search_catalog", { q: term, max_results: limit });
    if (error) throw error;
    const rows = (data ?? []) as SearchResult[];
    const subjectIds = Array.from(new Set(rows.map((r) => r.subject_id)));
    const bySubject = await getResourcesBySubject(subjectIds);
    // Several programs can have a subject with the same name (e.g. Engineering Economics in CSE and
    // Civil), so every label names its program.
    const programShort = new Map((await getPrograms()).map((p) => [p.slug, p.short_name?.trim() || p.slug.toUpperCase()] as const));

    // Parts of a split document are one result: keep the first, show the base title.
    const seenDocs = new Set<string>();
    return rows.filter((r) => {
      if (r.kind !== "resource") return true;
      const p = splitPartTitle(r.title);
      if (!p) return true;
      const k = `${r.subject_id}|${r.resource_type}|${p.base.toLowerCase()}`;
      if (seenDocs.has(k)) return false;
      seenDocs.add(k);
      return true;
    }).map((r) => {
      const list = bySubject.get(r.subject_id) ?? [];
      const types: string[] = [];
      if (list.some((x) => x.resource_type === "SYLLABUS")) types.push("Syllabus");
      if (list.some((x) => x.resource_type === "NOTES")) types.push("Notes");
      const pyqYears = yearRange(list.filter((x) => x.resource_type === "PYQ").flatMap((x) => x.available_years ?? []));
      if (list.some((x) => x.resource_type === "PYQ")) types.push(pyqYears ? `PYQ ${pyqYears}` : "PYQ");
      const prog = programShort.get(r.program_slug);
      const where = [prog, `Semester ${toRoman(r.semester_number)}`].filter(Boolean).join(" — ");
      const label =
        r.kind === "subject"
          ? [r.subject_name, where, types.join(" / ") || "No resources yet"].join(" — ")
          : [r.subject_name, where, r.resource_type ? r.resource_type : "Resource"].join(" — ");
      return {
        key: `${r.kind}-${r.id}`,
        kind: r.kind,
        title: (r.kind === "resource" && splitPartTitle(r.title)?.base) || r.title,
        label,
        href: `/subject/${r.subject_slug}`,
        premium: r.access_type === "PREMIUM",
      };
    });
  } catch (err) {
    console.error("[search] search_catalog failed", err);
    return [];
  }
}

