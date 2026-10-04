import type { BulkSubject } from "./bulk-matching";

export type ResourceKind = "SYLLABUS" | "PYQ" | "NOTES";
export type AccessKind = "FREE" | "PREMIUM";
export type RowStatus = "idle" | "queued" | "uploading" | "waiting" | "done" | "failed" | "cancelled";

/** A file picked or dropped, with its path relative to the chosen / dropped folder ("" for loose files). */
export interface Picked {
  file: File;
  path: string;
}

export interface Row {
  key: string;
  file: File;
  /** Relative path from a folder pick / drop ("" when the file was picked on its own). */
  relPath: string;
  pages: number | null;
  subjectId: string; // "" = skip
  checked: boolean;
  note: string;
  matchNote: string; // note from automatic matching
  manual: boolean; // subject chosen by hand
  /** In a folder starting with "_": never matched or checked automatically. */
  excluded: boolean;
  /** Resource title (or the base title when the file is split into parts). */
  title: string;
  /** Existing resource this row would replace (same subject, or same subject + title in "several per subject" mode). */
  existingId: string | null;
  status: RowStatus;
  stage: string;
  resourceId: string | null;
  error: string | null;
  errorCode: string | null;
  queued: boolean;
  /** Auto-split: 1-based page ranges of the parts once split (kept so a retry rebuilds the same parts). */
  partRanges: [number, number][] | null;
  /** Auto-split: parts already uploaded. A retry resumes after these and never re-uploads them. */
  uploadedParts: number;
  /** Auto-split: resource ids of the uploaded parts, in order. */
  partIds: string[];
}

/** An existing (non-failed) resource: public columns only. */
export interface ExistingResource {
  id: string;
  subjectId: string;
  title: string;
}

/** Existing resources per type, oldest update first (so the last one per subject is the newest). */
export type ExistingByType = Record<ResourceKind, ExistingResource[]>;

export interface BulkProgram {
  slug: string;
  name: string;
  subjects: BulkSubject[];
}

export const KINDS: Record<ResourceKind, { label: string; title: string; description: string; has: string; noun: string }> = {
  SYLLABUS: { label: "Syllabus", title: "Syllabus", description: "Official IOE syllabus", has: "a syllabus", noun: "syllabus" },
  PYQ: { label: "PYQ", title: "PYQ", description: "Past year questions", has: "a PYQ", noun: "PYQ" },
  NOTES: { label: "Notes", title: "Notes", description: "", has: "notes", noun: "notes" },
};

const MiB = 1024 * 1024;
/** Hard cap for one picked file. Only its parts (each under the per-upload limit) are sent. */
export const MAX_SOURCE_MB = 400;
export const MAX_SOURCE_BYTES = MAX_SOURCE_MB * MiB;
