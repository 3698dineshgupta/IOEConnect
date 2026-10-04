import type { CalcSemester, ChoiceMap, EntryMap, SavedSemester } from "./types";
import { choiceKey } from "./types";

export interface DraftState {
  entries: EntryMap;
  choices: ChoiceMap;
  /** Name printed on the gradesheet. */
  name: string;
}

export interface DraftStore {
  subscribe: (cb: () => void) => () => void;
  getSnapshot: () => DraftState;
  getServerSnapshot: () => DraftState;
  set: (updater: (s: DraftState) => DraftState) => void;
}

const MAX_LEN = 12;
const clip = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_LEN) : "");

/** Drafts built from the user's saved rows (server data). */
export function draftFromSaved(saved: SavedSemester[], semesters: CalcSemester[], name: string): DraftState {
  const entries: EntryMap = {};
  const choices: ChoiceMap = {};
  const known = new Map<string, number | null>();
  for (const sem of semesters) {
    for (const s of sem.core) known.set(s.slug, s.fullMarks);
    for (const g of sem.electives) for (const s of g.options) known.set(s.slug, s.fullMarks);
  }
  for (const row of saved) {
    for (const s of row.subjects) {
      if (!known.has(s.slug)) continue;
      entries[s.slug] = { obtained: String(s.obtained), fullMarks: known.get(s.slug) == null ? String(s.fullMarks) : "" };
    }
    const sem = semesters.find((x) => x.number === row.semester);
    for (const g of sem?.electives ?? []) {
      const hit = g.options.find((o) => row.subjects.some((s) => s.slug === o.slug));
      if (hit) choices[choiceKey(row.semester, g.label)] = hit.slug;
    }
  }
  return { entries, choices, name };
}

/** Validate untrusted localStorage JSON and merge it over `base` (local edits are newer). */
function mergeStored(base: DraftState, raw: unknown): DraftState {
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const entries: EntryMap = { ...base.entries };
  if (r.entries && typeof r.entries === "object") {
    for (const [slug, v] of Object.entries(r.entries as Record<string, unknown>)) {
      if (!v || typeof v !== "object" || slug.length > 200) continue;
      const e = v as Record<string, unknown>;
      entries[slug] = { obtained: clip(e.obtained), fullMarks: clip(e.fullMarks) };
    }
  }
  const choices: ChoiceMap = { ...base.choices };
  if (r.choices && typeof r.choices === "object") {
    for (const [k, v] of Object.entries(r.choices as Record<string, unknown>)) {
      if (typeof v === "string" && k.length < 100) choices[k] = v;
    }
  }
  const name = typeof r.name === "string" && r.name.trim() ? r.name.slice(0, 120) : base.name;
  return { entries, choices, name };
}

export function createDraftStore(initial: DraftState, storageKey: string): DraftStore {
  let state = initial;
  let loaded = false;
  const subs = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) state = mergeStored(initial, JSON.parse(raw));
    } catch {
      // Private mode / blocked storage / bad JSON: keep server state.
    }
  };

  return {
    subscribe(cb) {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    getSnapshot() {
      load();
      return state;
    },
    getServerSnapshot() {
      return initial;
    },
    set(updater) {
      load();
      state = updater(state);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Storage unavailable: the calculator still works for this visit.
      }
      subs.forEach((f) => f());
    },
  };
}
