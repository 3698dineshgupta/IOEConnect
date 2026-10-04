"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, FileText, UploadCloud, X, XCircle } from "lucide-react";
import { Button, Input, Label, Select, Spinner, Textarea, Progress } from "@/components/ui";
import { cn, formatBytes } from "@/lib/utils";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, type AccessType, type ResourceType } from "@/lib/types";
import { PageRangesEditor, YearCheckboxes, cleanRanges, type PageRanges } from "./pyq-fields";

export interface WizardProgram {
  slug: string;
  name: string;
  years: { number: number; semesters: { id: string; number: number; subjects: { id: string; name: string }[] }[] }[];
}

export interface WizardReplace {
  id: string;
  title: string;
  subjectId: string;
  resourceType: ResourceType;
  accessType: AccessType;
  description: string | null;
}

const STEPS = ["Where it goes", "Details", "PDF file"] as const;
const STAGES = [
  { key: "validated", label: "PDF validated" },
  { key: "compressed", label: "Compressed" },
  { key: "uploaded", label: "Uploaded" },
  { key: "saved", label: "Metadata saved" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
type StageState = "pending" | "active" | "done" | "skipped" | "error";

interface Outcome {
  resourceId: string | null;
  original: number | null;
  compressed: number | null;
  fallback: string | null;
  pages: number | null;
}

/** Map a free-form stage name from the stream onto one of our four checklist rows. */
function stageKeyOf(name: string): StageKey | null {
  const n = name.toLowerCase();
  if (/valid|check|inspect|read/.test(n)) return "validated";
  if (/compress|optimi/.test(n)) return "compressed";
  if (/upload|telegram|stor|send/.test(n)) return "uploaded";
  if (/sav|metadata|database|db|publish|insert|complete|done|finish/.test(n)) return "saved";
  return null;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pick = (o: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

async function countPages(file: File): Promise<number | null> {
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

export function UploadWizard({
  programs,
  maxMb,
  defaultAccess,
  compressionEnabled,
  initialSubjectId,
  replace,
}: {
  programs: WizardProgram[];
  maxMb: number;
  defaultAccess: AccessType;
  compressionEnabled: boolean;
  initialSubjectId?: string;
  replace?: WizardReplace;
}) {
  // Resolve the starting location from an initial subject id (replace mode or ?subject=).
  const startSubject = replace?.subjectId ?? initialSubjectId;
  const start = React.useMemo(() => {
    for (const p of programs)
      for (const y of p.years)
        for (const s of y.semesters)
          if (s.subjects.some((x) => x.id === startSubject)) return { program: p.slug, year: y.number, sem: s.id };
    return { program: programs[0]?.slug ?? "", year: 0, sem: "" };
  }, [programs, startSubject]);

  const [step, setStep] = React.useState(0);
  const [programSlug, setProgramSlug] = React.useState(start.program);
  const [yearNo, setYearNo] = React.useState<number>(start.year);
  const [semId, setSemId] = React.useState(start.sem);
  const [subjectId, setSubjectId] = React.useState(startSubject ?? "");
  const [type, setType] = React.useState<ResourceType>(replace?.resourceType ?? "NOTES");
  const [title, setTitle] = React.useState(replace?.title ?? "");
  const [description, setDescription] = React.useState(replace?.description ?? "");
  const [access, setAccess] = React.useState<AccessType>(replace?.accessType ?? defaultAccess);
  const [years, setYears] = React.useState<number[]>([]);
  const [ranges, setRanges] = React.useState<PageRanges>({});
  const [exam, setExam] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pages, setPages] = React.useState<number | null>(null);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [running, setRunning] = React.useState(false);
  const [stages, setStages] = React.useState<Record<StageKey, StageState>>({ validated: "pending", compressed: "pending", uploaded: "pending", saved: "pending" });
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const program = programs.find((p) => p.slug === programSlug);
  const year = program?.years.find((y) => y.number === yearNo);
  const semester = year?.semesters.find((s) => s.id === semId);
  const subject = semester?.subjects.find((s) => s.id === subjectId);
  const isPyq = type === "PYQ";

  if (!programs.length) {
    return <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No curriculum found. Seed years, semesters and subjects first.</p>;
  }

  function validateStep(s: number): string | null {
    if (s === 0 && (!year || !semester)) return "Choose a year and a semester.";
    if (s === 1) {
      if (!subject) return "Choose a subject.";
      if (!title.trim()) return "Enter a title.";
      if (isPyq) {
        if (!years.length) return "Select at least one available year.";
        const c = cleanRanges(years, ranges, null);
        if (c.error) return c.error;
      }
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    setError(err);
    if (!err) setStep(step + 1);
  }

  async function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return void setError("Only PDF files can be uploaded.");
    if (f.size > maxMb * 1024 * 1024) return void setError(`This file is ${formatBytes(f.size)}. The limit is ${maxMb} MB.`);
    if (f.size === 0) return void setError("This file is empty.");
    setFile(f);
    setPages(null);
    setPages(await countPages(f));
  }

  function applyEvent(ev: Record<string, unknown>, acc: Outcome) {
    // The route nests the final payload as {type:"result", result:{...}}.
    if (ev.type === "result" && ev.result && typeof ev.result === "object") {
      ev = { ...(ev.result as Record<string, unknown>), type: "result" };
    }
    if (ev.compressionStatus === "skipped") {
      // Under the compression threshold: not a failure, nothing to warn about.
      ev = { ...ev, skipped: true };
    }
    if (ev.compressionStatus === "fallback_original" && typeof ev.warning !== "string") {
      ev = { ...ev, fallback: true };
    }
    const kind = String(pick(ev, ["type", "event"]) ?? "");
    const stageName = String(pick(ev, ["stage", "step", "name"]) ?? "");
    const status = String(pick(ev, ["status", "state"]) ?? "").toLowerCase();

    if (ev.error || kind === "error" || status === "error" || status === "failed" || ev.ok === false) {
      throw new Error(String(pick(ev, ["error", "message"]) ?? "The upload failed."));
    }

    const original = num(pick(ev, ["original_size", "originalSize", "original_bytes", "original"]));
    const compressed = num(pick(ev, ["compressed_size", "compressedSize", "compressed_bytes", "compressed"]));
    const pg = num(pick(ev, ["page_count", "pageCount", "pages"]));
    if (original !== null) acc.original = original;
    if (compressed !== null) acc.compressed = compressed;
    if (pg !== null) acc.pages = pg;
    const rid = pick(ev, ["resource_id", "resourceId"]) ?? (typeof ev.resource === "object" && ev.resource ? (ev.resource as { id?: unknown }).id : undefined) ?? (kind === "result" || kind === "done" || kind === "complete" ? ev.id : undefined);
    if (typeof rid === "string") acc.resourceId = rid;
    const warn = pick(ev, ["warning", "fallback_reason"]);
    if (typeof warn === "string" && warn) acc.fallback = warn;
    if (ev.fallback === true || ev.compression_skipped === true || ev.compressionSkipped === true) {
      acc.fallback = acc.fallback ?? "Compression was unavailable, so the original PDF was stored.";
    }

    const key = stageName ? stageKeyOf(stageName) : kind === "result" || kind === "done" || kind === "complete" ? "saved" : null;
    if (key) {
      const skipped = status === "skipped" || ev.skipped === true || (key === "compressed" && acc.fallback !== null);
      const finished = ["done", "complete", "completed", "success", "ok", "finished", "saved"].includes(status) || kind === "result" || kind === "done" || kind === "complete";
      setStages((s) => {
        const copy = { ...s };
        const idx = STAGES.findIndex((x) => x.key === key);
        // Everything before a reported stage is done.
        STAGES.forEach((x, i) => {
          if (i < idx && copy[x.key] !== "skipped") copy[x.key] = "done";
        });
        copy[key] = skipped ? "skipped" : finished ? "done" : "active";
        if (kind === "result" || kind === "done" || kind === "complete") STAGES.forEach((x) => (copy[x.key] = copy[x.key] === "skipped" ? "skipped" : "done"));
        return copy;
      });
    }
  }

  async function submit() {
    if (!subject || !file) return;
    const c = cleanRanges(years, ranges, pages);
    if (isPyq && c.error) return void setError(c.error);
    setError(null);
    setFailure(null);
    setOutcome(null);
    setRunning(true);
    setStages({ validated: "active", compressed: "pending", uploaded: "pending", saved: "pending" });

    const fd = new FormData();
    fd.set("subject_id", subject.id);
    fd.set("resource_type", type);
    fd.set("access_type", access);
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    fd.set("available_years", JSON.stringify(isPyq ? years : []));
    fd.set("year_page_ranges", JSON.stringify(isPyq ? c.ranges : {}));
    fd.set("exam_type", isPyq ? exam.trim() : "");
    if (replace) fd.set("resource_id", replace.id);
    fd.set("file", file);

    const acc: Outcome = { resourceId: replace?.id ?? null, original: file.size, compressed: null, fallback: null, pages };
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok && !res.body) throw new Error("The upload failed.");
      const ctype = res.headers.get("content-type") ?? "";
      if (!res.ok && ctype.includes("application/json")) {
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const e = j.error;
        const msg = typeof e === "object" && e !== null ? (e as { message?: unknown }).message : (e ?? j.message);
        throw new Error(typeof msg === "string" && msg ? msg : "The upload failed.");
      }
      if (!res.ok) throw new Error(`The upload failed (${res.status}).`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("The server returned no progress information.");
      const decoder = new TextDecoder();
      let buf = "";
      let sawAny = false;
      const handle = (line: string) => {
        const t = line.trim();
        if (!t) return;
        let ev: unknown;
        try {
          ev = JSON.parse(t);
        } catch {
          return;
        }
        if (ev && typeof ev === "object") {
          sawAny = true;
          applyEvent(ev as Record<string, unknown>, acc);
        }
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
      if (!sawAny) throw new Error("The server did not report any progress. Check the resource list before retrying.");
      setStages((s) => ({ ...s, validated: "done", uploaded: "done", saved: "done", compressed: s.compressed === "skipped" || acc.fallback ? "skipped" : "done" }));
      setOutcome({ ...acc });
      toast.success("PDF uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "The upload failed.";
      setFailure(msg);
      setStages((s) => {
        const copy = { ...s };
        const active = STAGES.find((x) => copy[x.key] === "active");
        if (active) copy[active.key] = "error";
        return copy;
      });
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setStep(0);
    setTitle("");
    setDescription("");
    setYears([]);
    setRanges({});
    setExam("");
    setFile(null);
    setPages(null);
    setOutcome(null);
    setFailure(null);
    setStages({ validated: "pending", compressed: "pending", uploaded: "pending", saved: "pending" });
  }

  const started = running || outcome || failure;
  const saved = outcome && outcome.original && outcome.compressed ? Math.max(0, Math.round((1 - outcome.compressed / outcome.original) * 100)) : null;

  return (
    <div className="mx-auto max-w-3xl">
      {replace && (
        <p className="mb-4 rounded-md bg-accent-soft px-4 py-3 text-sm text-warning">
          Replacing the PDF of <strong>{replace.title}</strong>. Pick the new file in the last step.
        </p>
      )}

      <ol aria-label="Upload steps" className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check aria-hidden className="size-4" /> : i + 1}
            </span>
            <span className={cn("hidden text-sm sm:block", i === step ? "font-semibold" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        {step === 0 && (
          <div className="space-y-4">
            {programs.length > 1 && (
              <div>
                <Label htmlFor="w-program">Program</Label>
                <Select id="w-program" value={programSlug} onChange={(e) => { setProgramSlug(e.target.value); setYearNo(0); setSemId(""); setSubjectId(""); }}>
                  {programs.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-year">Year</Label>
                <Select id="w-year" value={yearNo || ""} onChange={(e) => { setYearNo(Number(e.target.value)); setSemId(""); setSubjectId(""); }}>
                  <option value="">Select year</option>
                  {program?.years.map((y) => (
                    <option key={y.number} value={y.number}>Year {y.number}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="w-sem">Semester</Label>
                <Select id="w-sem" value={semId} disabled={!year} onChange={(e) => { setSemId(e.target.value); setSubjectId(""); }}>
                  <option value="">Select semester</option>
                  {year?.semesters.map((s) => (
                    <option key={s.id} value={s.id}>Semester {s.number}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="w-subject">Subject</Label>
                <Select id="w-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select subject</option>
                  {semester?.subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="w-type">Resource type</Label>
                <Select id="w-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
                  {RESOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>{t === "PYQ" ? "PYQ (past questions)" : RESOURCE_TYPE_LABELS[t]}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="w-title">Title</Label>
              <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={isPyq ? "e.g. Engineering Mathematics III past questions" : "e.g. Complete notes, chapters 1 to 6"} />
            </div>
            <div>
              <Label htmlFor="w-desc">Description (optional)</Label>
              <Textarea id="w-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Access</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["FREE", "PREMIUM"] as const).map((a) => (
                  <label key={a} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium", access === a ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}>
                    <input type="radio" name="access" value={a} checked={access === a} onChange={() => setAccess(a)} className="accent-[var(--primary)]" />
                    {a === "FREE" ? "Free for everyone" : "Premium only"}
                  </label>
                ))}
              </div>
            </fieldset>
            {isPyq && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                <div>
                  <Label htmlFor="w-exam">Exam type</Label>
                  <Input id="w-exam" value={exam} onChange={(e) => setExam(e.target.value)} placeholder="e.g. Regular, Back, Board" maxLength={60} />
                </div>
                <YearCheckboxes value={years} onChange={setYears} />
                <PageRangesEditor years={years} value={ranges} onChange={setRanges} />
              </div>
            )}
          </div>
        )}

        {step === 2 && !started && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); void pickFile(e.dataTransfer.files?.[0] ?? null); }}
              className={cn("rounded-lg border-2 border-dashed p-8 text-center transition-colors", drag ? "border-primary bg-primary-soft" : "border-input")}
            >
              <UploadCloud aria-hidden className="mx-auto mb-3 size-10 text-primary" />
              <p className="font-semibold">Drag a PDF here</p>
              <p className="mt-1 text-sm text-muted-foreground">or choose a file. Up to {maxMb} MB.</p>
              <input ref={inputRef} id="w-file" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { void pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>Choose PDF</Button>
            </div>
            {file && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger"><FileText className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {pages ? `${pages} pages` : "counting pages…"}
                  </p>
                </div>
                <button type="button" onClick={() => { setFile(null); setPages(null); }} aria-label="Remove file" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted">
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Subject</dt><dd className="truncate font-medium">{subject?.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Type</dt><dd className="font-medium">{RESOURCE_TYPE_LABELS[type]}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Access</dt><dd className="font-medium">{access === "FREE" ? "Free" : "Premium"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Compression</dt><dd className="font-medium">{compressionEnabled ? "On" : "Off"}</dd></div>
            </dl>
          </div>
        )}

        {step === 2 && started && (
          <div aria-live="polite">
            <ul className="space-y-3">
              {STAGES.map((s) => {
                const st = stages[s.key];
                return (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    {st === "done" ? <CheckCircle2 aria-hidden className="size-5 text-success" /> : st === "active" ? <Spinner className="size-5 text-primary" /> : st === "error" ? <XCircle aria-hidden className="size-5 text-danger" /> : st === "skipped" ? <AlertTriangle aria-hidden className="size-5 text-warning" /> : <Circle aria-hidden className="size-5 text-muted-foreground/50" />}
                    <span className={cn(st === "pending" && "text-muted-foreground", st === "done" && "font-medium")}>
                      {s.label}
                      {st === "skipped" && " (skipped)"}
                    </span>
                  </li>
                );
              })}
            </ul>
            {running && <Progress className="mt-4" value={(Object.values(stages).filter((x) => x === "done" || x === "skipped").length / STAGES.length) * 100} label="Upload progress" />}

            {outcome?.fallback && (
              <p role="status" className="mt-4 flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> {outcome.fallback}
              </p>
            )}

            {outcome && (
              <div className="mt-5 space-y-4">
                {(outcome.original || outcome.compressed) && (
                  <dl className="grid grid-cols-1 gap-3 text-center min-[420px]:grid-cols-3">
                    <div className="rounded-lg bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Original</dt><dd className="font-bold">{formatBytes(outcome.original)}</dd></div>
                    <div className="rounded-lg bg-muted/60 p-3"><dt className="text-xs text-muted-foreground">Compressed</dt><dd className="font-bold">{outcome.compressed ? formatBytes(outcome.compressed) : "Not compressed"}</dd></div>
                    <div className="rounded-lg bg-success-soft p-3"><dt className="text-xs text-success">Saved</dt><dd className="font-bold text-success">{saved !== null ? `${saved}%` : "0%"}</dd></div>
                  </dl>
                )}
                <div className="rounded-lg border border-success/40 bg-success-soft p-4">
                  <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 aria-hidden className="size-5" /> Upload complete</p>
                  <p className="mt-1 text-sm">&ldquo;{title}&rdquo; is saved{outcome.pages ? ` (${outcome.pages} pages)` : ""}.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {outcome.resourceId && (
                      <Link href={`/view/${outcome.resourceId}`} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                        Open resource
                      </Link>
                    )}
                    <Link href="/admin/resources" className="inline-flex h-10 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-muted">Back to resources</Link>
                    {!replace && <Button variant="ghost" onClick={reset}>Upload another</Button>}
                  </div>
                </div>
              </div>
            )}

            {failure && (
              <div role="alert" className="mt-5 rounded-lg border border-danger/40 bg-danger-soft p-4 text-sm text-danger">
                <p className="font-semibold">Upload failed</p>
                <p className="mt-1">{failure}</p>
                <Button className="mt-3" variant="outline" onClick={() => { setFailure(null); setStages({ validated: "pending", compressed: "pending", uploaded: "pending", saved: "pending" }); }}>
                  Try again
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm font-medium text-danger">{error}</p>}

        {!(step === 2 && started) && (
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => { setError(null); setStep(step - 1); }} disabled={step === 0}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={next}>Continue <ArrowRight aria-hidden /></Button>
            ) : (
              <Button variant="accent" onClick={submit} disabled={!file} loading={running}>
                <UploadCloud aria-hidden /> {replace ? "Replace PDF" : "Upload PDF"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
