// Client-safe shared helpers for the community features.
import type { BugStatus, ContactStatus, RequestStatus, StudentUploadStatus } from "@/lib/types";

export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export type BadgeTone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "outline";

export const UPLOAD_STATUS_META: Record<StudentUploadStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  PUBLISHED: { label: "Published", tone: "primary" },
};

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  IN_PROGRESS: { label: "In progress", tone: "primary" },
  COMPLETED: { label: "Completed", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const CONTACT_STATUS_META: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  UNREAD: { label: "Unread", tone: "accent" },
  READ: { label: "Read", tone: "neutral" },
  REPLIED: { label: "Replied", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "outline" },
};

export const BUG_STATUS_META: Record<BugStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: "Open", tone: "danger" },
  INVESTIGATING: { label: "Investigating", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const RESOURCE_MARKER = /\n?\[\[resource:([a-z0-9-]+)\|([^\]]{1,200})\]\]\s*$/;

/** Admin notes may carry a trailing "[[resource:<subject-slug>|<title>]]" link marker. */
export function parseAdminNote(note: string | null | undefined): {
  text: string;
  resource: { subjectSlug: string; title: string } | null;
} {
  if (!note) return { text: "", resource: null };
  const m = RESOURCE_MARKER.exec(note);
  if (!m) return { text: note, resource: null };
  return { text: note.replace(RESOURCE_MARKER, "").trim(), resource: { subjectSlug: m[1], title: m[2] } };
}

export function buildAdminNote(text: string, resource: { subjectSlug: string; title: string } | null): string | null {
  const clean = text.trim();
  const marker = resource ? `[[resource:${resource.subjectSlug}|${resource.title.replace(/[\]|\n]/g, " ").slice(0, 200)}]]` : "";
  const out = [clean, marker].filter(Boolean).join("\n");
  return out || null;
}

export interface SubjectOption {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  /** Group key, e.g. "computer:5" */
  group: string;
  groupLabel: string;
}

export function pdfBasename(path: string): string {
  return path.split("/").pop() ?? path;
}

export function formatNpr(n: number): string {
  return `NPR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`;
}
