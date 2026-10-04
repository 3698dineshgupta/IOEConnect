import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import type {
  Program,
  ProgramTree,
  PublicResourceView,
  Semester,
  SemesterContext,
  SemesterWithSubjects,
  Subject,
  SubjectWithContext,
  Year,
  YearWithSemesters,
} from "@/lib/types";

/**
 * Cache tags. After admin writes call e.g.
 *   revalidateTag(CURRICULUM_CACHE_TAG, { expire: 0 })
 *   revalidateTag(RESOURCES_CACHE_TAG, { expire: 0 })
 */
export const CURRICULUM_CACHE_TAG = "curriculum";
export const RESOURCES_CACHE_TAG = "resources";

const REVALIDATE_SECONDS = 3600;

type RawSemester = Semester & { subjects: Subject[] | null };
type RawYear = Year & { semesters: RawSemester[] | null };
type RawProgramTree = Program & { years: RawYear[] | null };

const bySortThenName = (a: Subject, b: Subject) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

function normalizeTree(raw: RawProgramTree): ProgramTree {
  const years: YearWithSemesters[] = (raw.years ?? [])
    .map((y) => {
      const semesters: SemesterWithSubjects[] = (y.semesters ?? [])
        .map((s) => ({ ...s, subjects: [...(s.subjects ?? [])].sort(bySortThenName) }))
        .sort((a, b) => a.number - b.number);
      return { ...y, semesters };
    })
    .sort((a, b) => a.number - b.number);
  return { ...raw, years };
}

// ---------------------------------------------------------------------------
// getPrograms
// ---------------------------------------------------------------------------
const cachedPrograms = unstable_cache(
  async (): Promise<Program[]> => {
    const { data, error } = await createStaticClient()
      .from("programs")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Program[];
  },
  ["curriculum:programs"],
  { tags: [CURRICULUM_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);

/** Active programs, ordered. Returns [] on failure (logged). */
export const getPrograms = cache(async (): Promise<Program[]> => {
  try {
    return await cachedPrograms();
  } catch (err) {
    console.error("[curriculum] getPrograms failed", err);
    return [];
  }
});

// ---------------------------------------------------------------------------
// getProgramTree
// ---------------------------------------------------------------------------
const cachedProgramTree = unstable_cache(
  async (slug: string): Promise<ProgramTree | null> => {
    const { data, error } = await createStaticClient()
      .from("programs")
      .select("*, years(*, semesters(*, subjects(*)))")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data ? normalizeTree(data as RawProgramTree) : null;
  },
  ["curriculum:program-tree"],
  { tags: [CURRICULUM_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);

/** Program with years -> semesters -> subjects (all sorted), or null. */
export const getProgramTree = cache(async (slug: string): Promise<ProgramTree | null> => {
  if (!slug) return null;
  try {
    return await cachedProgramTree(slug.toLowerCase());
  } catch (err) {
    console.error("[curriculum] getProgramTree failed", { slug, err });
    return null;
  }
});

// ---------------------------------------------------------------------------
// getSemester
// ---------------------------------------------------------------------------
/**
 * Resolve a semester inside a program/year.
 * `semNo` may be the absolute semester number (1..8) or the position within
 * the year (1..2); absolute numbers are matched first.
 */
export const getSemester = cache(
  async (programSlug: string, yearNo: number, semNo: number): Promise<SemesterContext | null> => {
    if (!Number.isInteger(yearNo) || !Number.isInteger(semNo)) return null;
    const tree = await getProgramTree(programSlug);
    if (!tree) return null;
    const year = tree.years.find((y) => y.number === yearNo);
    if (!year) return null;
    const semester =
      year.semesters.find((s) => s.number === semNo) ??
      (semNo >= 1 && semNo <= year.semesters.length ? year.semesters[semNo - 1] : undefined);
    if (!semester) return null;

    const { years: _years, ...program } = tree;
    void _years;
    const { semesters: _semesters, ...yearRow } = year;
    void _semesters;
    const { subjects, ...semesterRow } = semester;
    return { program, year: yearRow, semester: semesterRow, subjects };
  },
);

// ---------------------------------------------------------------------------
// getSubjectBySlug
// ---------------------------------------------------------------------------
type RawSubjectWithContext = Subject & {
  semester: (Semester & { year: (Year & { program: Program | null }) | null }) | null;
};

const cachedSubject = unstable_cache(
  async (slug: string): Promise<SubjectWithContext | null> => {
    const { data, error } = await createStaticClient()
      .from("subjects")
      .select("*, semester:semesters(*, year:years(*, program:programs(*)))")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const raw = data as RawSubjectWithContext;
    const sem = raw.semester;
    const yr = sem?.year;
    const prog = yr?.program;
    if (!sem || !yr || !prog || !prog.is_active) return null;
    const { semester: _s, ...subject } = raw;
    void _s;
    const { year: _y, ...semester } = sem;
    void _y;
    const { program: _p, ...year } = yr;
    void _p;
    return { ...subject, semester, year, program: prog };
  },
  ["curriculum:subject"],
  { tags: [CURRICULUM_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);

/** Subject with its semester, year and program, or null. */
export const getSubjectBySlug = cache(async (slug: string): Promise<SubjectWithContext | null> => {
  if (!slug) return null;
  try {
    return await cachedSubject(slug.toLowerCase());
  } catch (err) {
    console.error("[curriculum] getSubjectBySlug failed", { slug, err });
    return null;
  }
});

// ---------------------------------------------------------------------------
// Published resources of a subject (extra helper; safe columns only)
// ---------------------------------------------------------------------------
/**
 * Ids of the OTHER subjects that are the same course in another program (same `share_group`, e.g.
 * Engineering Mathematics I in CSE and Civil). Empty when the subject isn't grouped, and also when the
 * `share_group` column doesn't exist yet (migration 20261005000010 not applied): sharing is optional.
 */
async function sharedSubjectIds(subjectId: string): Promise<string[]> {
  const client = createStaticClient();
  const me = await client.from("subjects").select("share_group").eq("id", subjectId).maybeSingle();
  const group = !me.error ? (me.data as { share_group?: string | null } | null)?.share_group : null;
  if (!group) return [];
  const mates = await client.from("subjects").select("id").eq("share_group", group).neq("id", subjectId);
  if (mates.error) return [];
  return (mates.data ?? []).map((r) => r.id as string);
}

/** The subject itself plus its same-course twins in other programs ({slug, name}); just itself when ungrouped. */
export async function getSharedSubjects(subjectId: string): Promise<{ slug: string; name: string }[]> {
  try {
    const client = createStaticClient();
    const me = await client.from("subjects").select("slug, name, share_group").eq("id", subjectId).maybeSingle();
    if (me.error || !me.data) return [];
    const self = me.data as { slug: string; name: string; share_group?: string | null };
    const out = [{ slug: self.slug, name: self.name }];
    if (self.share_group) {
      const mates = await client.from("subjects").select("slug, name").eq("share_group", self.share_group).neq("id", subjectId);
      if (!mates.error) out.push(...((mates.data ?? []) as { slug: string; name: string }[]));
    }
    return out;
  } catch {
    return [];
  }
}

const cachedSubjectResources = unstable_cache(
  async (subjectId: string): Promise<PublicResourceView[]> => {
    const client = createStaticClient();
    const own = await client.from("public_resources").select("*").eq("subject_id", subjectId);
    if (own.error) throw own.error;
    const rows = (own.data ?? []) as PublicResourceView[];

    // Notes, PYQs and other resources of the same course in another program also show here.
    // Syllabus is excluded: each program has its own syllabus document.
    const mates = await sharedSubjectIds(subjectId).catch(() => []);
    if (mates.length) {
      const shared = await client.from("public_resources").select("*").in("subject_id", mates).neq("resource_type", "SYLLABUS");
      if (!shared.error) rows.push(...((shared.data ?? []) as PublicResourceView[]));
    }
    return rows.sort((a, b) => a.resource_type.localeCompare(b.resource_type) || (a.created_at < b.created_at ? 1 : -1));
  },
  ["curriculum:subject-resources"],
  { tags: [RESOURCES_CACHE_TAG], revalidate: 300 },
);

/** PUBLISHED resources for a subject (no Telegram identifiers). */
export const getSubjectResources = cache(async (subjectId: string): Promise<PublicResourceView[]> => {
  if (!subjectId) return [];
  try {
    return await cachedSubjectResources(subjectId);
  } catch (err) {
    console.error("[curriculum] getSubjectResources failed", { subjectId, err });
    return [];
  }
});
