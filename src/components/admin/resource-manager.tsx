"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Eye, FileUp, Lock, LockOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { formatBytes, formatDate } from "@/lib/utils";
import { ACCESS_TYPES, RESOURCE_TYPE_LABELS, type AccessType, type ResourceStatus, type ResourceType } from "@/lib/types";
import { PageRangesEditor, YearCheckboxes, cleanRanges, type PageRanges } from "./pyq-fields";
import {
  deleteResourceAction,
  moveResourceAction,
  setResourceAccessAction,
  updateResourceAction,
} from "@/app/admin/resources/actions";

export interface AdminResourceRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  access_type: AccessType;
  status: ResourceStatus;
  page_count: number | null;
  file_size: number | null;
  compressed_file_size: number | null;
  available_years: number[];
  year_page_ranges: PageRanges;
  exam_type: string | null;
  view_count: number;
  created_at: string;
}

export interface SubjectOption {
  id: string;
  label: string;
  semesterLabel: string;
}

const statusVariant: Record<ResourceStatus, "success" | "warning" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  PROCESSING: "warning",
  DRAFT: "neutral",
  FAILED: "danger",
  ARCHIVED: "neutral",
};

type Dlg = { kind: "edit" | "move" | "delete"; row: AdminResourceRow } | null;

export function ResourceManager({ rows, subjects, currentSubjectId }: { rows: AdminResourceRow[]; subjects: SubjectOption[]; currentSubjectId: string }) {
  const router = useRouter();
  const [dlg, setDlg] = React.useState<Dlg>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function toggleAccess(r: AdminResourceRow) {
    const next = r.access_type === "FREE" ? "PREMIUM" : "FREE";
    setBusy(r.id);
    const res = await setResourceAccessAction(r.id, next);
    setBusy(null);
    if (res.ok) {
      toast.success(`Access changed to ${next === "FREE" ? "Free" : "Premium"}`);
      router.refresh();
    } else toast.error(res.error);
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No resources for this subject yet"
        description="Upload the first PDF and it will appear here."
        action={
          <Link href={`/admin/upload?subject=${currentSubjectId}`} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
            <FileUp aria-hidden className="size-4" /> Upload PDF
          </Link>
        }
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="primary">{RESOURCE_TYPE_LABELS[r.resource_type]}</Badge>
                <Badge variant={r.access_type === "PREMIUM" ? "accent" : "success"}>
                  {r.access_type === "PREMIUM" ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
                  {r.access_type === "PREMIUM" ? "Premium" : "Free"}
                </Badge>
                <Badge variant={statusVariant[r.status]}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge>
              </div>
              <p className="mt-1.5 break-words font-semibold">{r.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.page_count ? `${r.page_count} pages · ` : ""}
                {formatBytes(r.compressed_file_size ?? r.file_size)} · {r.view_count} views · {formatDate(r.created_at)}
                {r.resource_type === "PYQ" && r.available_years.length > 0 ? ` · ${r.available_years.join(", ")}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/view/${r.id}`}
                className="inline-flex h-10 items-center sm:h-8 gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-semibold hover:bg-muted"
              >
                <Eye aria-hidden className="size-4" /> View
              </Link>
              <Button size="sm" variant="outline" onClick={() => setDlg({ kind: "edit", row: r })}>
                <Pencil aria-hidden /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`More actions for ${r.title}`}
                  className="inline-flex size-10 items-center sm:size-8 justify-center rounded-md border border-input bg-card hover:bg-muted"
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => toggleAccess(r)} disabled={busy === r.id}>
                    {r.access_type === "FREE" ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
                    Make {r.access_type === "FREE" ? "premium" : "free"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDlg({ kind: "move", row: r })}>
                    <ArrowRightLeft aria-hidden /> Move to another subject
                  </DropdownMenuItem>
                  <DropdownMenuItem href={`/admin/upload?resource=${r.id}`}>
                    <FileUp aria-hidden /> Replace PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onSelect={() => setDlg({ kind: "delete", row: r })}>
                    <Trash2 aria-hidden /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>

      {dlg?.kind === "edit" && <EditDialog key={dlg.row.id} row={dlg.row} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); router.refresh(); }} />}
      {dlg?.kind === "move" && (
        <MoveDialog key={dlg.row.id} row={dlg.row} subjects={subjects} currentSubjectId={currentSubjectId} onClose={() => setDlg(null)} onMoved={() => { setDlg(null); router.refresh(); }} />
      )}
      {dlg?.kind === "delete" && <DeleteDialog key={dlg.row.id} row={dlg.row} onClose={() => setDlg(null)} onDeleted={() => { setDlg(null); router.refresh(); }} />}
    </>
  );
}

function EditDialog({ row, onClose, onSaved }: { row: AdminResourceRow; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState(row.title);
  const [description, setDescription] = React.useState(row.description ?? "");
  const [access, setAccess] = React.useState<AccessType>(row.access_type);
  const [years, setYears] = React.useState<number[]>(row.available_years);
  const [ranges, setRanges] = React.useState<PageRanges>(row.year_page_ranges ?? {});
  const [exam, setExam] = React.useState(row.exam_type ?? "");
  const [saving, setSaving] = React.useState(false);
  const isPyq = row.resource_type === "PYQ";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const c = cleanRanges(years, ranges, row.page_count);
    if (c.error) return void toast.error(c.error);
    setSaving(true);
    const res = await updateResourceAction({
      id: row.id,
      title,
      description: description.trim() || null,
      access_type: access,
      available_years: isPyq ? years : [],
      year_page_ranges: isPyq ? c.ranges : {},
      exam_type: isPyq ? exam.trim() || null : null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Resource saved");
      onSaved();
    } else toast.error(res.error);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Edit resource" className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <form onSubmit={save} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
          <DialogDescription>{RESOURCE_TYPE_LABELS[row.resource_type]}. To change the PDF itself, use Replace PDF.</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="e-title">Title</Label>
          <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} data-autofocus />
        </div>
        <div>
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
        </div>
        <div>
          <Label htmlFor="e-access">Access</Label>
          <Select id="e-access" value={access} onChange={(e) => setAccess(e.target.value as AccessType)}>
            {ACCESS_TYPES.map((a) => (
              <option key={a} value={a}>{a === "FREE" ? "Free" : "Premium"}</option>
            ))}
          </Select>
        </div>
        {isPyq && (
          <>
            <div>
              <Label htmlFor="e-exam">Exam type</Label>
              <Input id="e-exam" value={exam} onChange={(e) => setExam(e.target.value)} placeholder="e.g. Regular, Back, Board" maxLength={60} />
            </div>
            <YearCheckboxes value={years} onChange={setYears} />
            <PageRangesEditor years={years} value={ranges} onChange={setRanges} pageCount={row.page_count} />
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function MoveDialog({ row, subjects, currentSubjectId, onClose, onMoved }: { row: AdminResourceRow; subjects: SubjectOption[]; currentSubjectId: string; onClose: () => void; onMoved: () => void }) {
  const [target, setTarget] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const groups = React.useMemo(() => {
    const m = new Map<string, SubjectOption[]>();
    for (const s of subjects) if (s.id !== currentSubjectId) m.set(s.semesterLabel, [...(m.get(s.semesterLabel) ?? []), s]);
    return [...m.entries()];
  }, [subjects, currentSubjectId]);

  async function move() {
    setSaving(true);
    const res = await moveResourceAction(row.id, target);
    setSaving(false);
    if (res.ok) {
      toast.success("Resource moved");
      onMoved();
    } else toast.error(res.error);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Move resource">
      <DialogHeader>
        <DialogTitle>Move resource</DialogTitle>
        <DialogDescription>Choose the semester and subject for &ldquo;{row.title}&rdquo;.</DialogDescription>
      </DialogHeader>
      <Label htmlFor="m-subject">Subject</Label>
      <Select id="m-subject" value={target} onChange={(e) => setTarget(e.target.value)} data-autofocus>
        <option value="">Select a subject</option>
        {groups.map(([label, list]) => (
          <optgroup key={label} label={label}>
            {list.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </optgroup>
        ))}
      </Select>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={move} disabled={!target} loading={saving}>Move resource</Button>
      </DialogFooter>
    </Dialog>
  );
}

function DeleteDialog({ row, onClose, onDeleted }: { row: AdminResourceRow; onClose: () => void; onDeleted: () => void }) {
  const [saving, setSaving] = React.useState(false);
  async function del() {
    setSaving(true);
    const res = await deleteResourceAction(row.id);
    setSaving(false);
    if (res.ok) {
      toast.success("Resource deleted");
      onDeleted();
    } else toast.error(res.error);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Delete resource">
      <DialogHeader>
        <DialogTitle>Delete this resource?</DialogTitle>
        <DialogDescription>
          &ldquo;{row.title}&rdquo; will be removed for every student and its view history is lost. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-autofocus>Keep resource</Button>
        <Button variant="danger" onClick={del} loading={saving}>Delete resource</Button>
      </DialogFooter>
    </Dialog>
  );
}
