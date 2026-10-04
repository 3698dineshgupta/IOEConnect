/**
 * Upload of one bulk-upload row: a normal file is one POST; a file above the split threshold is split
 * into parts that are uploaded one after another as separate resources ("<title> — Part i of n").
 * Each POST retries on rate limits. A failed part stops the row; a retry resumes at that part.
 */
import type { SplitResult } from "@/lib/pdf-split";
import type { BulkSubject } from "./bulk-matching";
import { RetryLater, UploadError, postOne, sleep } from "./bulk-client";
import { SplitFailed, splitFile } from "./bulk-split";
import { partFileName, partReplaceId, partTitle, type ExistingIndex } from "./bulk-titles";
import type { AccessKind, ResourceKind, Row } from "./bulk-types";

export interface QueueDeps {
  subject: BulkSubject;
  kind: ResourceKind;
  access: AccessKind;
  replace: boolean;
  index: ExistingIndex;
  /** Files above this many bytes are split. */
  splitAbove: number;
  /** Largest part in bytes. */
  partMax: number;
  /** Split results kept for this session, so a retry does not split again. */
  cache: Map<string, SplitResult>;
  patch: (p: Partial<Row>) => void;
  cancelled: () => boolean;
}

type SendResult = { ok: true; id: string } | { ok: false; cancelled: true } | { ok: false; cancelled: false; error: string; code: string | null };

/** One file through the normal pipeline, waiting out rate limits. `label` prefixes the stage text ("Part 2 of 5"). */
async function send(file: File, title: string, replaceId: string | null, label: string, d: QueueDeps): Promise<SendResult> {
  const pre = label ? `${label}: ` : "";
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const id = await postOne(file, d.subject, { kind: d.kind, access: d.access, title, replaceId: replaceId ?? undefined }, (s) => d.patch({ status: "uploading", stage: pre + s }));
      return { ok: true, id };
    } catch (e) {
      if (e instanceof RetryLater) {
        for (let s = e.seconds; s > 0; s--) {
          if (d.cancelled()) return { ok: false, cancelled: true };
          d.patch({ status: "waiting", stage: `${pre}Rate limited. Retrying in ${s}s` });
          await sleep(1000);
        }
        if (d.cancelled()) return { ok: false, cancelled: true };
        d.patch({ status: "uploading", stage: `${pre}Retrying` });
        continue;
      }
      const msg = e instanceof TypeError ? "Network error. The file may not have been sent." : e instanceof Error ? e.message : "The upload failed.";
      return { ok: false, cancelled: false, error: msg, code: e instanceof UploadError ? e.code : null };
    }
  }
  return { ok: false, cancelled: false, error: "Still rate limited after many attempts.", code: null };
}

/** Upload one row. Resolves true when every part is stored (the row is "done"). */
export async function uploadRow(row: Row, d: QueueDeps): Promise<boolean> {
  d.patch({ status: "uploading", stage: "Starting", error: null, errorCode: null });

  if (row.file.size <= d.splitAbove) {
    const r = await send(row.file, row.title, d.replace ? row.existingId : null, "", d);
    if (r.ok) d.patch({ status: "done", stage: "", resourceId: r.id, partIds: [r.id], checked: false });
    else if (r.cancelled) d.patch({ status: "cancelled", stage: "" });
    else d.patch({ status: "failed", stage: "", error: r.error, errorCode: r.code });
    return r.ok;
  }

  // --- Auto-split -------------------------------------------------------------
  let split = d.cache.get(row.key);
  if (!split) {
    d.patch({ status: "uploading", stage: "Splitting…" });
    try {
      split = await splitFile(row.file, {
        maxBytes: d.partMax,
        ranges: row.partRanges ?? undefined,
        onProgress: (p) => d.patch({ stage: `Splitting… part ${Math.min(p.done + 1, p.total)} of ${p.total}` }),
      });
    } catch (e) {
      const msg = e instanceof SplitFailed ? e.message : "The PDF could not be split. Please try again.";
      d.patch({ status: "failed", stage: "", error: msg, errorCode: "SPLIT_FAILED" });
      return false;
    }
    d.cache.set(row.key, split);
    d.patch({ partRanges: split.pageRanges });
  }

  const n = split.parts.length;
  const ids = row.partIds.slice(0, row.uploadedParts);
  for (let i = row.uploadedParts; i < n; i++) {
    if (d.cancelled()) {
      d.patch({ status: "cancelled", stage: "" });
      return false;
    }
    const label = n > 1 ? `Part ${i + 1} of ${n}` : "";
    const file = new File([split.parts[i] as BlobPart], n > 1 ? partFileName(row.file.name, i + 1, n) : row.file.name, { type: "application/pdf" });
    const replaceId = d.replace ? partReplaceId(d.index, d.subject.id, row.title, i + 1, row.existingId) : null;
    const r = await send(file, partTitle(row.title, i + 1, n), replaceId, label, d);
    if (!r.ok) {
      if (r.cancelled) d.patch({ status: "cancelled", stage: "" });
      else d.patch({ status: "failed", stage: "", error: label ? `${label}: ${r.error}` : r.error, errorCode: r.code });
      return false;
    }
    ids.push(r.id);
    d.patch({ uploadedParts: i + 1, partIds: [...ids] });
  }
  d.cache.delete(row.key);
  d.patch({ status: "done", stage: "", resourceId: ids[0] ?? null, checked: false });
  return true;
}
