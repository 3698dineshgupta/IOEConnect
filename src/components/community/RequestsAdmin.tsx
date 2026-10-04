"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
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
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { deleteResourceRequest, updateResourceRequest } from "@/lib/actions/requests";
import { REQUEST_STATUSES, RESOURCE_TYPE_LABELS, type RequestStatus, type ResourceType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { REQUEST_STATUS_META, parseAdminNote } from "./common";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { FormMessage } from "./FormMessage";

export interface AdminRequestRow {
  id: string;
  subject_id: string | null;
  subject_text: string | null;
  subject_name: string | null;
  resource_type: ResourceType | null;
  years: string | null;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  requester: string;
}

export interface LinkableResource {
  id: string;
  title: string;
}

export function RequestsAdmin({
  rows,
  resourcesBySubject,
}: {
  rows: AdminRequestRow[];
  resourcesBySubject: Record<string, LinkableResource[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminRequestRow | null>(null);
  const [status, setStatus] = React.useState<RequestStatus>("PENDING");
  const [note, setNote] = React.useState("");
  const [resourceId, setResourceId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function open(r: AdminRequestRow) {
    setEditing(r);
    setStatus(r.status);
    setNote(parseAdminNote(r.admin_note).text);
    setResourceId("");
    setError(null);
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = await updateResourceRequest(editing.id, { status, note, resourceId });
      if (!res.ok) return setError(res.error);
      setEditing(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return <EmptyState icon={<MessageSquarePlus aria-hidden />} title="No requests here" description="Requests with this status will appear in this list." />;
  }

  const linkable = editing?.subject_id ? (resourcesBySubject[editing.subject_id] ?? []) : [];
  const existingLink = editing ? parseAdminNote(editing.admin_note).resource : null;

  return (
    <>
      <ul className="space-y-3">
        {rows.map((r) => {
          const meta = REQUEST_STATUS_META[r.status];
          const n = parseAdminNote(r.admin_note);
          return (
            <li key={r.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{r.subject_name ?? r.subject_text ?? "Unknown subject"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {r.resource_type ? RESOURCE_TYPE_LABELS[r.resource_type] : "Any type"}
                      {r.years ? ` - ${r.years}` : ""} - by {r.requester} - {formatDate(r.created_at)}
                    </p>
                    {r.message && <p className="mt-2 whitespace-pre-line break-words text-sm">{r.message}</p>}
                    {n.text && (
                      <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="font-semibold">Note: </span>
                        <span className="whitespace-pre-line break-words">{n.text}</span>
                      </p>
                    )}
                    {n.resource && <p className="mt-2 text-sm text-muted-foreground">Linked: {n.resource.title}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant={meta.tone}>{meta.label}</Badge>
                    <Button size="sm" variant="outline" onClick={() => open(r)}>
                      <Pencil aria-hidden /> Update
                    </Button>
                    <ConfirmActionButton
                      title="Delete this request?"
                      description="The request will be permanently removed."
                      confirmLabel="Delete"
                      variant="danger"
                      label="Delete request"
                      action={() => deleteResourceRequest(r.id)}
                    >
                      <Trash2 aria-hidden />
                    </ConfirmActionButton>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(o) => !pending && !o && setEditing(null)} title="Update request">
        {editing && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Update request</DialogTitle>
              <DialogDescription className="break-words">{editing.subject_name ?? editing.subject_text}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="rq-status">Status</Label>
              <Select id="rq-status" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rq-note">Note to the student {status === "REJECTED" ? "(required)" : "(optional)"}</Label>
              <Textarea id="rq-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
            </div>
            {status === "COMPLETED" && (
              <div className="space-y-1.5">
                <Label htmlFor="rq-res">Link a published resource (optional)</Label>
                <Select id="rq-res" value={resourceId} onChange={(e) => setResourceId(e.target.value)} disabled={!editing.subject_id}>
                  <option value="">{existingLink ? `Keep current: ${existingLink.title}` : "No link"}</option>
                  {existingLink && <option value="none">Remove link</option>}
                  {linkable.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.title}
                    </option>
                  ))}
                </Select>
                {!editing.subject_id && (
                  <p className="text-xs text-muted-foreground">Linking needs a request tied to a catalog subject.</p>
                )}
              </div>
            )}
            {error && <FormMessage kind="error">{error}</FormMessage>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </Button>
              <Button loading={pending} onClick={save}>
                Save
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </>
  );
}
