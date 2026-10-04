"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import { submitStudentUpload } from "@/lib/actions/uploads";
import { formatBytes } from "@/lib/utils";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, type ResourceType } from "@/lib/types";
import type { SubjectOption } from "./common";
import { SubjectPicker } from "./SubjectPicker";
import { FormMessage } from "./FormMessage";

async function looksLikePdf(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

export function UploadForm({ userId, options, maxMb }: { userId: string; options: SubjectOption[]; maxMb: number }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [subjectId, setSubjectId] = React.useState("");
  const [type, setType] = React.useState<ResourceType>("NOTES");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) return setFile(null);
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      e.target.value = "";
      setFile(null);
      return setError("Only PDF files are accepted.");
    }
    if (f.size > maxMb * 1024 * 1024) {
      e.target.value = "";
      setFile(null);
      return setError(`That file is ${formatBytes(f.size)}. The maximum is ${maxMb} MB.`);
    }
    if (f.size === 0 || !(await looksLikePdf(f))) {
      e.target.value = "";
      setFile(null);
      return setError("That file does not look like a valid PDF.");
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!subjectId) return setError("Please choose a semester and subject.");
    if (title.trim().length < 3) return setError("Please enter a title (at least 3 characters).");
    if (!file) return setError("Please choose a PDF file.");

    setBusy(true);
    const filePath = `${userId}/${crypto.randomUUID()}.pdf`;
    try {
      const supabase = createBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("student-uploads")
        .upload(filePath, file, { contentType: "application/pdf", upsert: false });
      if (upErr) {
        console.error(upErr);
        setError("The file could not be uploaded. Please check your connection and try again.");
        return;
      }
      const res = await submitStudentUpload({ subjectId, resourceType: type, title, description, filePath });
      if (!res.ok) {
        // The action removes the object on failure paths it handles; best-effort here too.
        await supabase.storage.from("student-uploads").remove([filePath]).catch(() => undefined);
        setError(res.error);
        return;
      }
      setSuccess(true);
      setTitle("");
      setDescription("");
      setFile(null);
      setSubjectId("");
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
      <SubjectPicker options={options} value={subjectId} onChange={setSubjectId} idPrefix="up" disabled={busy} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="up-type">Type</Label>
          <Select id="up-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)} disabled={busy}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="up-title">Title</Label>
          <Input id="up-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 handwritten notes" disabled={busy} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="up-desc">Description (optional)</Label>
        <Textarea id="up-desc" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Anything reviewers should know: batch, year of the exam, quality…" disabled={busy} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="up-file">PDF file (max {maxMb} MB)</Label>
        <Input
          id="up-file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFileChange}
          disabled={busy}
          className="h-auto cursor-pointer py-2 file:mr-3 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm file:font-semibold file:text-primary"
        />
        {file && <p className="text-xs text-muted-foreground">{file.name} - {formatBytes(file.size)}</p>}
      </div>
      <p className="text-xs text-muted-foreground">
        Only upload material you have the right to share. Uploads are reviewed by our team before anything is published.
      </p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {success && <FormMessage kind="success">Thank you! Your upload was submitted and is waiting for review.</FormMessage>}
      <Button type="submit" loading={busy} disabled={busy}>
        <UploadCloud aria-hidden /> {busy ? "Uploading…" : "Submit for review"}
      </Button>
    </form>
  );
}
