"use client";

import * as React from "react";
import { AlertTriangle, FolderUp, RefreshCw, RotateCcw, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Checkbox, Progress, Select } from "@/components/ui";
import { refreshCurriculumAction } from "@/app/admin/bulk-upload/actions";
import { cn, formatBytes } from "@/lib/utils";
import { MAX_PART, SPLIT_ABOVE } from "@/lib/pdf-split-limits";
import type { SplitResult } from "@/lib/pdf-split";
import { matchPicked, type BulkSubject } from "./bulk-matching";
import { countPages, filesFromDrop, pickedFromInput } from "./bulk-client";
import { uploadRow } from "./bulk-queue";
import { buildExistingIndex, claimKey, evaluate, type EvalContext, type ExistingIndex } from "./bulk-titles";
import { KINDS, MAX_SOURCE_BYTES, MAX_SOURCE_MB, type AccessKind, type BulkProgram, type ExistingByType, type Picked, type ResourceKind, type Row } from "./bulk-types";
import { DeleteAllSyllabi } from "./bulk-delete-syllabi";
import { RowsHeader, RowsList } from "./bulk-rows";

export type { BulkSubject } from "./bulk-matching";

const MiB = 1024 * 1024;
const KIND_LIST = Object.keys(KINDS) as ResourceKind[];

export function BulkUpload({ programs, existingByType, maxMb }: { programs: BulkProgram[]; existingByType: ExistingByType; maxMb: number }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [programSlug, setProgramSlug] = React.useState(programs[0]?.slug ?? "");

  async function refreshPrograms() {
    setRefreshing(true);
    try {
      const res = await refreshCurriculumAction();
      if (!res.ok) return void toast.error(res.error);
      router.refresh();
      toast.success("Programs refreshed.");
    } catch {
      toast.error("Could not refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }
  const [kind, setKind] = React.useState<ResourceKind>("SYLLABUS");
  const [access, setAccess] = React.useState<AccessKind>("FREE");
  const [replaceMode, setReplaceMode] = React.useState(false);
  const [multi, setMulti] = React.useState(false);
  // Mirrors for the async upload queue.
  const kindRef = React.useRef<ResourceKind>("SYLLABUS");
  const accessRef = React.useRef<AccessKind>("FREE");
  const replaceRef = React.useRef(false);
  const multiRef = React.useRef(false);

  const program = programs.find((p) => p.slug === programSlug) ?? programs[0];
  const subjects = React.useMemo(() => program?.subjects ?? [], [program]);
  const programIds = React.useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);
  /** Every program's subjects: rows uploading to (or done for) a previously selected program keep working. */
  const allSubjects = React.useMemo(() => new Map(programs.flatMap((p) => p.subjects.map((s) => [s.id, s] as const))), [programs]);
  const indexes = React.useMemo(() => Object.fromEntries(KIND_LIST.map((x) => [x, buildExistingIndex(existingByType[x])])) as Record<ResourceKind, ExistingIndex>, [existingByType]);
  const index = indexes[kind];
  const k = KINDS[kind];
  const semesters = React.useMemo(() => {
    const m = new Map<number, BulkSubject[]>();
    for (const s of subjects) m.set(s.semesterNumber, [...(m.get(s.semesterNumber) ?? []), s]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [subjects]);
  const existingSubjects = React.useMemo(() => new Set([...index.bySubject.keys()].filter((id) => programIds.has(id))), [index, programIds]);
  const existingCount = multi ? existingByType[kind].filter((r) => programIds.has(r.subjectId)).length : existingSubjects.size;
  const syllabusCount = React.useMemo(() => existingByType.SYLLABUS.filter((r) => programIds.has(r.subjectId)).length, [existingByType, programIds]);
  // Split above the Telegram-safe size, or above the server's per-upload limit if that is lower.
  const splitAbove = Math.min(SPLIT_ABOVE, maxMb * MiB);
  const partMax = Math.min(MAX_PART, Math.floor(maxMb * MiB * 0.95));

  const [rows, setRows] = React.useState<Row[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [finished, setFinished] = React.useState(false);

  const cancelRef = React.useRef(false);
  const runningRef = React.useRef(false);
  const uploadedRef = React.useRef(new Set<string>());
  const seenRef = React.useRef(new Set<string>());
  const splitCache = React.useRef(new Map<string, SplitResult>());
  const pageChain = React.useRef<Promise<void>>(Promise.resolve());
  const fileInput = React.useRef<HTMLInputElement>(null);
  const dirInput = React.useRef<HTMLInputElement>(null);

  const patch = React.useCallback((key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r))), []);
  const ctxFor = (kindX: ResourceKind, multiX: boolean, replaceX: boolean, claimed: Set<string>): EvalContext => ({
    kind: kindX, multi: multiX, replace: replaceX, index: indexes[kindX], subjectById: allSubjects, claimed,
  });

  React.useEffect(() => {
    if (!running) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [running]);

  function addFiles(list: Picked[]) {
    const bad: string[] = [];
    const fresh: Row[] = [];
    const claimed = new Set<string>(rows.filter((r) => r.checked && r.status === "idle").map((r) => claimKey(r, multiRef.current)));
    const ctx = ctxFor(kindRef.current, multiRef.current, replaceRef.current, claimed);
    for (const { file: f, path } of list) {
      const id = `${path || f.name}:${f.size}:${f.lastModified}`;
      if (seenRef.current.has(id)) continue;
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        bad.push(`${path || f.name}: not a PDF`);
        continue;
      }
      if (f.size === 0) {
        bad.push(`${f.name}: file is empty`);
        continue;
      }
      // Bigger files are split into parts below the per-upload limit, so only a sanity cap applies.
      if (f.size > MAX_SOURCE_BYTES) {
        bad.push(`${f.name}: ${formatBytes(f.size)} is over the ${MAX_SOURCE_MB} MB limit for one file. Split it on your computer first.`);
        continue;
      }
      seenRef.current.add(id);
      const m = matchPicked(f.name, path, subjects);
      const row: Row = {
        key: id, file: f, relPath: path, pages: null, subjectId: m.subject?.id ?? "", checked: false, note: m.note, matchNote: m.note, manual: false,
        excluded: !!m.excluded, title: "", existingId: null, status: "idle", stage: "", resourceId: null, error: null, errorCode: null, queued: false,
        partRanges: null, uploadedParts: 0, partIds: [],
      };
      fresh.push(evaluate(row, ctx, false));
    }
    setRejected(bad);
    if (!fresh.length) return;
    setFinished(false);
    setRows((rs) => [...rs, ...fresh].sort((a, b) => (a.relPath || a.file.name).localeCompare(b.relPath || b.file.name, undefined, { numeric: true })));
    // Count pages one file at a time so a big batch does not freeze the tab.
    for (const r of fresh) {
      pageChain.current = pageChain.current.then(async () => {
        patch(r.key, { pages: await countPages(r.file) });
      });
    }
  }

  function setSubject(key: string, subjectId: string) {
    setRows((rs) => {
      const claimed = new Set(rs.filter((r) => r.key !== key && r.checked && r.status === "idle").map((r) => claimKey(r, multi)));
      const ctx = ctxFor(kind, multi, replaceMode, claimed);
      return rs.map((r) => (r.key === key ? evaluate({ ...r, subjectId, manual: !!subjectId, note: subjectId ? "Chosen manually" : "Skipped" }, ctx, false) : r));
    });
  }

  /** Re-evaluate every row still waiting to upload (type, mode or replace changed). */
  function reevaluate(nextKind: ResourceKind, nextMulti: boolean, replace: boolean, keepChecked: boolean) {
    setRows((rs) => {
      const ctx = ctxFor(nextKind, nextMulti, replace, new Set<string>());
      return rs.map((r) => (r.status === "idle" && r.subjectId ? evaluate(r, ctx, keepChecked) : r));
    });
  }

  function changeReplaceMode(on: boolean) {
    replaceRef.current = on;
    setReplaceMode(on);
    reevaluate(kind, multi, on, true);
  }

  function changeMulti(on: boolean) {
    multiRef.current = on;
    setMulti(on);
    reevaluate(kind, on, replaceMode, false);
  }

  function changeKind(next: ResourceKind) {
    if (running) return;
    const nextMulti = next === "NOTES"; // several files per subject: on for Notes, off otherwise
    kindRef.current = next;
    multiRef.current = nextMulti;
    setKind(next);
    setMulti(nextMulti);
    reevaluate(next, nextMulti, replaceMode, false);
  }

  /** Switch program: rows still waiting are matched again against the new program's subjects only. */
  function changeProgram(slug: string) {
    if (running) return;
    const next = programs.find((p) => p.slug === slug);
    if (!next) return;
    setProgramSlug(slug);
    setRows((rs) => {
      const ctx = ctxFor(kind, multi, replaceMode, new Set<string>());
      return rs.map((r) => {
        if (r.status !== "idle") return r;
        const m = matchPicked(r.file.name, r.relPath, next.subjects);
        return evaluate({ ...r, subjectId: m.subject?.id ?? "", manual: false, excluded: !!m.excluded, note: m.note, matchNote: m.note }, ctx, false);
      });
    });
  }

  async function runQueue(queue: Row[]) {
    if (runningRef.current || !queue.length) return;
    runningRef.current = true;
    cancelRef.current = false;
    setCancelling(false);
    setRunning(true);
    setFinished(false);
    const keys = new Set(queue.map((r) => r.key));
    setRows((rs) => rs.map((r) => (keys.has(r.key) ? { ...r, status: "queued", queued: true, error: null, errorCode: null } : { ...r, queued: false })));
    for (const row of queue) {
      if (cancelRef.current) {
        patch(row.key, { status: "cancelled" });
        continue;
      }
      const subject = allSubjects.get(row.subjectId);
      if (!subject || uploadedRef.current.has(row.key)) continue;
      const ok = await uploadRow(row, {
        subject, kind: kindRef.current, access: accessRef.current, replace: replaceRef.current, index: indexes[kindRef.current],
        splitAbove, partMax, cache: splitCache.current, patch: (p) => patch(row.key, p), cancelled: () => cancelRef.current,
      });
      if (ok) uploadedRef.current.add(row.key);
    }
    runningRef.current = false;
    setRunning(false);
    setCancelling(false);
    setFinished(true);
  }

  function clearList() {
    const done = rows.filter((r) => r.status === "done");
    setRows(done);
    setRejected([]);
    seenRef.current = new Set(done.map((r) => r.key));
    splitCache.current = new Map();
  }

  // A target that already exists is only uploaded in replace mode (never creates a duplicate).
  const eligible = rows.filter((r) => r.checked && r.subjectId && r.status !== "done" && (replaceMode || !r.existingId));
  const matched = rows.filter((r) => r.subjectId).length;
  const skipped = rows.length - matched;
  const queuedRows = rows.filter((r) => r.queued);
  const settled = queuedRows.filter((r) => ["done", "failed", "cancelled"].includes(r.status)).length;
  const doneN = queuedRows.filter((r) => r.status === "done").length;
  const failedN = queuedRows.filter((r) => r.status === "failed").length;
  const cancelledN = queuedRows.filter((r) => r.status === "cancelled").length;
  const noun = k.noun;

  return (
    <div className="space-y-5">
      <section aria-label="Upload settings" className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="bulk-program" className="block text-sm font-medium">Program</label>
            <button
              type="button"
              onClick={() => void refreshPrograms()}
              disabled={running || refreshing}
              className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw aria-hidden className={cn("size-3", refreshing && "animate-spin")} /> Refresh programs
            </button>
          </div>
          <Select id="bulk-program" value={program?.slug ?? ""} disabled={running || programs.length < 2} onChange={(e) => changeProgram(e.target.value)}>
            {programs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </Select>
          {programs.length < 2 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Only {programs.length === 1 ? `${programs[0].name}` : "no program"} found. Added another with the SQL seed? Run it in Supabase, then click Refresh programs.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="bulk-kind" className="mb-1.5 block text-sm font-medium">Resource type</label>
          <Select id="bulk-kind" value={kind} disabled={running} onChange={(e) => changeKind(e.target.value as ResourceKind)}>
            {KIND_LIST.map((x) => <option key={x} value={x}>{KINDS[x].label}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="bulk-access" className="mb-1.5 block text-sm font-medium">Access</label>
          <Select id="bulk-access" value={access} disabled={running} onChange={(e) => { accessRef.current = e.target.value as AccessKind; setAccess(e.target.value as AccessKind); }}>
            <option value="FREE">Free</option>
            <option value="PREMIUM">Premium</option>
          </Select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm sm:col-span-3">
          <Checkbox className="mt-0.5" checked={multi} disabled={running} onChange={(e) => changeMulti(e.target.checked)} aria-describedby="multi-help" />
          <span>
            <span className="font-semibold">Several files per subject: title from file name</span>
            <span id="multi-help" className="mt-0.5 block text-muted-foreground">
              {multi
                ? "Each file becomes its own resource titled from its file name (prefixed with the subject name when missing). A file already uploaded with the same title is skipped."
                : <>One file per subject, titled &ldquo;&lt;Subject&gt; {k.title}&rdquo;.</>}
            </span>
          </span>
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Matching only uses {program?.name ?? "the selected program"}&rsquo;s subjects. Years and page ranges are left empty; set them later in Resources if needed.
        </p>
      </section>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!running) void filesFromDrop(e.dataTransfer).then(addFiles);
        }}
        className={cn("rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8", drag ? "border-primary bg-primary-soft" : "border-input")}
      >
        <UploadCloud aria-hidden className="mx-auto mb-3 size-10 text-primary" />
        <p className="font-semibold">Drop PDFs or a folder here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDFs only, up to {MAX_SOURCE_MB} MB each. Files over {formatBytes(splitAbove)} are split automatically into parts of at most {formatBytes(partMax)}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          In a folder, a subfolder named after a subject (e.g. <span className="font-mono">notes/c-programming/</span>) sends its files to that subject. Subfolders starting with _ are left out.
        </p>
        <input ref={fileInput} type="file" accept="application/pdf,.pdf" multiple className="sr-only" aria-label="Choose PDF files" onChange={(e) => { addFiles(pickedFromInput(e.target.files)); e.target.value = ""; }} />
        <input
          ref={dirInput}
          type="file"
          multiple
          className="sr-only"
          aria-label="Choose a folder of PDFs"
          {...({ webkitdirectory: "" } as Record<string, string>)}
          onChange={(e) => { addFiles(pickedFromInput(e.target.files)); e.target.value = ""; }}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" disabled={running} onClick={() => fileInput.current?.click()}>
            <UploadCloud aria-hidden /> Choose PDFs
          </Button>
          <Button variant="outline" disabled={running} onClick={() => dirInput.current?.click()}>
            <FolderUp aria-hidden /> Choose folder
          </Button>
        </div>
      </div>

      {kind === "SYLLABUS" && program && (
        <DeleteAllSyllabi
          programSlug={program.slug}
          programName={program.name}
          count={syllabusCount}
          busy={running}
          onDeleted={() => {
            // Matches were computed against the old list, so start clean.
            replaceRef.current = false;
            setReplaceMode(false);
            setRows([]);
            setRejected([]);
            seenRef.current = new Set();
            uploadedRef.current = new Set();
            splitCache.current = new Map();
            router.refresh();
          }}
        />
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
        <Checkbox className="mt-0.5" checked={replaceMode} disabled={running} onChange={(e) => changeReplaceMode(e.target.checked)} aria-describedby="replace-help" />
        <span>
          <span className="font-semibold">
            Replace existing {noun} ({multi ? `${existingCount} already uploaded` : `${existingCount} subject${existingCount === 1 ? "" : "s"} already have one`})
          </span>
          <span id="replace-help" className="mt-0.5 block text-muted-foreground">
            The new PDF is stored first, then swapped into the existing resource and the old file is deleted, so students never see a gap.
            If an upload fails, the old file stays as it was. Off: {multi ? "files already uploaded with the same title" : `subjects that already have ${k.has}`} are skipped.
          </span>
        </span>
      </label>

      {rejected.length > 0 && (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden className="size-4" /> {rejected.length} file{rejected.length === 1 ? "" : "s"} skipped</p>
          <ul className="mt-1 list-disc pl-6">
            {rejected.slice(0, 8).map((m) => <li key={m} className="break-all">{m}</li>)}
            {rejected.length > 8 && <li>and {rejected.length - 8} more</li>}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <section aria-label="Review and upload" className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <p className="text-sm font-semibold" aria-live="polite">
              {matched} matched, {skipped} skipped
              <span className="ml-2 font-normal text-muted-foreground">{eligible.length} selected to upload as {k.label} ({access === "FREE" ? "free" : "premium"})</span>
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" disabled={running} onClick={() => setRows((rs) => rs.map((r) => (r.status === "done" ? r : { ...r, checked: !!r.subjectId })))}>Select all</Button>
              <Button size="sm" variant="ghost" disabled={running} onClick={() => setRows((rs) => rs.map((r) => (r.status === "done" ? r : { ...r, checked: false })))}>Select none</Button>
              <Button size="sm" variant="ghost" disabled={running} onClick={clearList}>Clear list</Button>
              {running ? (
                <Button variant="danger" size="sm" disabled={cancelling} onClick={() => { cancelRef.current = true; setCancelling(true); }}>
                  {cancelling ? "Stopping after this file" : "Cancel"}
                </Button>
              ) : (
                <Button variant="accent" disabled={!eligible.length} onClick={() => void runQueue(eligible)}>
                  <UploadCloud aria-hidden /> Start upload ({eligible.length})
                </Button>
              )}
            </div>
          </div>

          {queuedRows.length > 0 && (
            <div className="border-b border-border p-4">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>{running ? "Uploading one file at a time. Keep this tab open." : "Finished"}</span>
                <span>{settled} of {queuedRows.length}</span>
              </div>
              <Progress value={settled} max={queuedRows.length} label="Overall upload progress" tone={failedN ? "accent" : "primary"} />
            </div>
          )}

          {finished && (
            <div role="status" className="border-b border-border bg-muted/40 p-4 text-sm">
              <p className="font-semibold">Upload finished</p>
              <p className="mt-1">
                <span className="text-success">{doneN} uploaded</span>
                {failedN > 0 && <>, <span className="text-danger">{failedN} failed</span></>}
                {cancelledN > 0 && <>, {cancelledN} not attempted</>}.
              </p>
              {(failedN > 0 || cancelledN > 0) && (
                <Button className="mt-2" size="sm" variant="outline" onClick={() => void runQueue(rows.filter((r) => r.queued && (r.status === "failed" || r.status === "cancelled") && r.subjectId))}>
                  <RotateCcw aria-hidden /> Retry failed and remaining
                </Button>
              )}
            </div>
          )}

          <RowsHeader />
          <RowsList
            rows={rows}
            semesters={semesters}
            programSubjectIds={programIds}
            subjectById={allSubjects}
            existing={existingSubjects}
            hasLabel={`has ${k.noun}`}
            showTitles={multi}
            splitAbove={splitAbove}
            partMax={partMax}
            running={running}
            onCheck={(key, checked) => patch(key, { checked })}
            onSubject={setSubject}
            onRetry={(r) => void runQueue([r])}
          />
        </section>
      )}
    </div>
  );
}
