"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Eye, FileText, Pencil, Rocket, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import {
  deleteStudentUpload,
  getUploadPreviewUrl,
  publishStudentUpload,
  reviewStudentUpload,
  updateStudentUploadMeta,
} from "@/lib/actions/uploads";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABELS, type ResourceType, type StudentUploadStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { UPLOAD_STATUS_META, type SubjectOption } from "./common";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { FormMessage } from "./FormMessage";
import { SubjectPicker } from "./SubjectPicker";

export interface AdminUploadRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  status: StudentUploadStatus;
  review_note: string | null;
  subject_id: string | null;
  subject_name: string | null;
  uploader: string;
  created_at: string;
}

type Mode = { kind: "preview" | "reject" | "edit"; row: AdminUploadRow } | null;

export function UploadsAdmin({ rows, options }: { rows: AdminUploadRow[]; options: SubjectOption[] }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  // preview
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  // reject / approve note
  const [note, setNote] = React.useState("");
  // edit
  const [subjectId, setSubjectId] = React.useState("");
  const [type, setType] = React.useState<ResourceType>("NOTES");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  function close() {
    if (pending) return;
    setMode(null);
    setPreviewUrl(null);
    setError(null);
  }

  function openPreview(row: AdminUploadRow) {
    setMode({ kind: "preview", row });
    setPreviewUrl(null);
    setError(null);
    startTransition(async () => {
      const res = await getUploadPreviewUrl(row.id);
      if (res.ok) setPreviewUrl(res.url);
      else setError(res.error);
    });
  }

  function openReject(row: AdminUploadRow) {
    setMode({ kind: "reject", row });
    setNote(row.review_note ?? "");
    setError(null);
  }

  function openEdit(row: AdminUploadRow) {
    setMode({ kind: "edit", row });
    setSubjectId(row.subject_id ?? "");
    setType(row.resource_type);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setError(null);
  }

  function submitReject() {
    if (mode?.kind !== "reject") return;
    const id = mode.row.id;
    setError(null);
    startTransition(async () => {
      const res = await reviewStudentUpload(id, "REJECTED", note);
      if (!res.ok) return setError(res.error);
      setMode(null);
      router.refresh();
    });
  }

  function submitEdit() {
    if (mode?.kind !== "edit") return;
    const id = mode.row.id;
    setError(null);
    startTransition(async () => {
      const res = await updateStudentUploadMeta(id, { subjectId, resourceType: type, title, description });
      if (!res.ok) return setError(res.error);
      setMode(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState icon={<FileText aria-hidden />} title="No uploads here" description="Uploads with this status will appear in this list." />;
  }

  return (
    <>
      <ul className="space-y-3">
        {rows.map((r) => {
          const meta = UPLOAD_STATUS_META[r.status];
          const canReview = r.status === "PENDING" || r.status === "APPROVED" || r.status === "REJECTED";
          return (
            <li key={r.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{r.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {r.subject_name ?? "No subject"} - {RESOURCE_TYPE_LABELS[r.resource_type]} - by {r.uploader} - {formatDate(r.created_at)}
                    </p>
                    {r.description && <p className="mt-2 whitespace-pre-line break-words text-sm">{r.description}</p>}
                    {r.review_note && (
                      <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="font-semibold">Review note: </span>
                        <span className="whitespace-pre-line break-words">{r.review_note}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant={meta.tone} className="self-start">
                    {meta.label}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPreview(r)}>
                    <Eye aria-hidden /> Preview
                  </Button>
                  {canReview && r.status !== "APPROVED" && (
                    <ConfirmActionButton
                      title="Approve this upload?"
                      description="The student will see it as approved. You can publish it afterwards."
                      confirmLabel="Approve"
                      variant="outline"
                      action={() => reviewStudentUpload(r.id, "APPROVED", "")}
                    >
                      <Check aria-hidden /> Approve
                    </ConfirmActionButton>
                  )}
                  {canReview && r.status !== "REJECTED" && (
                    <Button size="sm" variant="outline" onClick={() => openReject(r)}>
                      <X aria-hidden /> Reject
                    </Button>
                  )}
                  {r.status !== "PUBLISHED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        <Pencil aria-hidden /> Edit
                      </Button>
                      {r.status !== "REJECTED" && (
                        <ConfirmActionButton
                          title="Publish as a resource?"
                          description="The PDF is compressed and stored through the standard upload pipeline, then listed under its subject."
                          confirmLabel="Publish"
                          variant="accent"
                          action={() => publishStudentUpload(r.id)}
                        >
                          <Rocket aria-hidden /> Publish
                        </ConfirmActionButton>
                      )}
                    </>
                  )}
                  <ConfirmActionButton
                    title="Delete this upload?"
                    description="The record and the stored PDF are permanently deleted."
                    confirmLabel="Delete"
                    variant="danger"
                    action={() => deleteStudentUpload(r.id)}
                  >
                    <Trash2 aria-hidden /> Delete
                  </ConfirmActionButton>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Preview */}
      <Dialog open={mode?.kind === "preview"} onOpenChange={(o) => !o && close()} title="PDF preview" className="max-w-4xl">
        {mode?.kind === "preview" && (
          <div>
            <DialogHeader>
              <DialogTitle className="break-words">{mode.row.title}</DialogTitle>
              <DialogDescription>Temporary link: expires after 60 seconds. Close and reopen to refresh.</DialogDescription>
            </DialogHeader>
            {error ? (
              <FormMessage kind="error">{error}</FormMessage>
            ) : !previewUrl ? (
              <p role="status" className="py-10 text-center text-sm text-muted-foreground">Preparing preview…</p>
            ) : (
              <>
                <iframe src={previewUrl} title={`Preview of ${mode.row.title}`} className="h-[65vh] w-full rounded-md border border-border bg-muted" />
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <ExternalLink aria-hidden className="size-4" /> Open in a new tab
                </a>
              </>
            )}
          </div>
        )}
      </Dialog>

      {/* Reject */}
      <Dialog open={mode?.kind === "reject"} onOpenChange={(o) => !o && close()} title="Reject upload">
        {mode?.kind === "reject" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Reject upload</DialogTitle>
              <DialogDescription className="break-words">{mode.row.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="rj-note">Reason (shown to the student)</Label>
              <Textarea id="rj-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <FormMessage kind="error">{error}</FormMessage>}
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" loading={pending} onClick={submitReject}>
                Reject
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* Edit */}
      <Dialog open={mode?.kind === "edit"} onOpenChange={(o) => !o && close()} title="Edit upload" className="max-h-[90vh] max-w-xl overflow-y-auto">
        {mode?.kind === "edit" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit metadata</DialogTitle>
            </DialogHeader>
            <SubjectPicker options={options} value={subjectId} onChange={setSubjectId} idPrefix="ed" />
            <div className="space-y-1.5">
              <Label htmlFor="ed-type">Type</Label>
              <Select id="ed-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RESOURCE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-title">Title</Label>
              <Input id="ed-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-desc">Description</Label>
              <Textarea id="ed-desc" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <FormMessage kind="error">{error}</FormMessage>}
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button loading={pending} onClick={submitEdit}>
                Save
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </>
  );
}
