import type { BulkSubject } from "./bulk-matching";
import type { AccessKind, Picked, ResourceKind } from "./bulk-types";
import { KINDS } from "./bulk-types";

export async function countPages(file: File): Promise<number | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const doc = await task.promise;
    const n = doc.numPages;
    void task.destroy();
    return n;
  } catch {
    try {
      const text = new TextDecoder("latin1").decode(new Uint8Array(await file.arrayBuffer()));
      const m = text.match(/\/Type\s*\/Page[^s]/g);
      return m?.length ? m.length : null;
    } catch {
      return null;
    }
  }
}

const STAGE_TEXT: Record<string, string> = {
  validated: "PDF validated",
  compressed: "Uploading to storage",
  uploaded: "Uploaded, saving",
  saved: "Saved",
};

export class RetryLater extends Error {
  constructor(public seconds: number) {
    super("rate limited");
  }
}

/** An upload failure that carries the server's error code. */
export class UploadError extends Error {
  constructor(
    message: string,
    public code: string | null,
  ) {
    super(message);
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function errMessage(j: Record<string, unknown>): string {
  const e = j.error;
  const m = typeof e === "object" && e !== null ? (e as { message?: unknown }).message : (e ?? j.message);
  return typeof m === "string" && m ? m : "The upload failed.";
}

function errCode(j: Record<string, unknown>): string | null {
  const e = j.error;
  const c = typeof e === "object" && e !== null ? (e as { code?: unknown }).code : undefined;
  const v = c ?? j.code;
  return typeof v === "string" ? v : null;
}

/** Short actionable hint for known server error codes. */
export function errorHint(code: string | null): string | null {
  switch (code) {
    case "FILE_TOO_LARGE_FOR_STORAGE":
      return "Still over 20 MB on the server. Remove the file and add it again so it is split into smaller parts.";
    case "FILE_TOO_LARGE":
    case "PDF_TOO_LARGE":
      return "The file is over the server's upload limit (Settings: max upload size).";
    case "SPLIT_FAILED":
      return "Open the PDF on your computer, save or print it to a new PDF without a password, then add it again.";
    case "STORAGE_NOT_CONFIGURED":
      return "File storage is not set up on the server. Check the Telegram settings.";
    case "RESOURCE_BUSY":
      return "That resource is still processing. Retry in a minute.";
    default:
      return null;
  }
}

/** One POST + NDJSON read. Resolves with the resource id, throws RetryLater on 429 or UploadError otherwise. */
export async function postOne(
  file: File,
  subject: BulkSubject,
  opts: { kind: ResourceKind; access: AccessKind; title: string; replaceId?: string },
  onStage: (s: string) => void,
): Promise<string> {
  const k = KINDS[opts.kind];
  const fd = new FormData();
  // Replace mode: the route stores the new file first, then swaps it into this resource
  // and deletes the old Telegram copy.
  if (opts.replaceId) fd.set("resource_id", opts.replaceId);
  fd.set("subject_id", subject.id);
  fd.set("resource_type", opts.kind);
  fd.set("access_type", opts.access);
  fd.set("title", opts.title);
  fd.set("description", k.description);
  // No invented years or page ranges.
  fd.set("available_years", "[]");
  fd.set("year_page_ranges", "{}");
  fd.set("exam_type", "");
  fd.set("file", file);

  const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "same-origin" });
  const ctype = res.headers.get("content-type") ?? "";
  if (!res.ok || ctype.includes("application/json")) {
    const j = ctype.includes("application/json") ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
    if (res.status === 429) {
      const e = j.error as { retryAfter?: unknown } | undefined;
      const secs = Number(res.headers.get("Retry-After")) || (typeof e?.retryAfter === "number" ? e.retryAfter : 0) || 10;
      throw new RetryLater(Math.min(Math.max(Math.ceil(secs), 1), 600));
    }
    const msg = res.ok ? errMessage(j) : Object.keys(j).length ? errMessage(j) : `The upload failed (${res.status}).`;
    throw new UploadError(msg, errCode(j));
  }
  const reader = res.body?.getReader();
  if (!reader) throw new UploadError("The server returned no progress information.", null);

  const decoder = new TextDecoder();
  let buf = "";
  let resourceId: string | null = null;
  const handle = (line: string) => {
    const t = line.trim();
    if (!t) return;
    let ev: unknown;
    try {
      ev = JSON.parse(t);
    } catch {
      return;
    }
    if (!ev || typeof ev !== "object") return;
    let o = ev as Record<string, unknown>;
    if (o.type === "result" && o.result && typeof o.result === "object") o = { ...(o.result as Record<string, unknown>), type: "result" };
    if (o.type === "error" || o.error || o.ok === false) throw new UploadError(errMessage(o), errCode(o));
    if (typeof o.resourceId === "string") resourceId = o.resourceId;
    if (typeof o.resource_id === "string") resourceId = o.resource_id;
    if (o.type === "stage" && typeof o.stage === "string") onStage(STAGE_TEXT[o.stage] ?? o.stage);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    lines.forEach(handle);
  }
  handle(buf);
  if (!resourceId) throw new UploadError("The server did not confirm the upload. Check the resource list before retrying.", null);
  return resourceId;
}

/** Files from a folder `<input webkitdirectory>` or a plain file pick, with their relative paths. */
export function pickedFromInput(list: FileList | null): Picked[] {
  return Array.from(list ?? []).map((file) => ({ file, path: file.webkitRelativePath || "" }));
}

/** Files from a drop, walking dropped folders. Each keeps its path inside the drop ("folder/sub/file.pdf"). */
export async function filesFromDrop(dt: DataTransfer): Promise<Picked[]> {
  const out: Picked[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File | null>((res) => (entry as FileSystemFileEntry).file(res, () => res(null)));
      if (f) out.push({ file: f, path: entry.fullPath.replace(/^\/+/, "") });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res) => reader.readEntries(res, () => res([])));
        if (!batch.length) break;
        for (const e of batch) await walk(e);
      }
    }
  };
  const entries = Array.from(dt.items ?? [])
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return Array.from(dt.files).map((file) => ({ file, path: "" }));
  for (const e of entries) await walk(e);
  return out;
}
