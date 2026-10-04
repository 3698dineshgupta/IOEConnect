"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, CheckCheck, Inbox, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { Badge, Button, Card, Dialog, DialogDescription, DialogHeader, DialogTitle, EmptyState } from "@/components/ui";
import { deleteContactMessage, setContactStatus } from "@/lib/actions/contact";
import type { ContactMessage, ContactStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CONTACT_STATUS_META } from "./common";
import { ConfirmActionButton } from "./ConfirmActionButton";
import { FormMessage } from "./FormMessage";

function mailtoHref(m: ContactMessage): string {
  const subject = `Re: ${m.subject || "Your message to IOE Connect"}`;
  const quoted = m.message
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const body = `Hi ${m.name},\n\n\n\nOn ${formatDate(m.created_at)} you wrote:\n${quoted}`;
  return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function MessagesAdmin({ messages }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<ContactMessage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function setStatus(m: ContactMessage, status: ContactStatus, opts: { silent?: boolean; close?: boolean } = {}) {
    setError(null);
    startTransition(async () => {
      const res = await setContactStatus(m.id, status, { silent: opts.silent });
      if (!res.ok) return setError(res.error);
      if (opts.close) setSelected(null);
      else setSelected((cur) => (cur && cur.id === m.id ? { ...cur, status } : cur));
      router.refresh();
    });
  }

  function open(m: ContactMessage) {
    setError(null);
    setSelected(m);
    if (m.status === "UNREAD") setStatus(m, "READ", { silent: true });
  }

  if (messages.length === 0) {
    return <EmptyState icon={<Inbox aria-hidden />} title="No messages here" description="Messages with this status will appear in this list." />;
  }

  return (
    <>
      <ul className="space-y-2">
        {messages.map((m) => {
          const meta = CONTACT_STATUS_META[m.status];
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => open(m)}
                className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={m.status === "UNREAD" ? "font-bold" : "font-semibold"}>{m.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={meta.tone}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(m.created_at, { withTime: true })}</span>
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium">{m.subject || "(no subject)"}</p>
                <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">{m.message}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title="Message details"
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {selected && (
          <div>
            <DialogHeader>
              <DialogTitle className="break-words">{selected.subject || "(no subject)"}</DialogTitle>
              <DialogDescription>
                From {selected.name} &lt;{selected.email}&gt; - {formatDate(selected.created_at, { withTime: true })}
                {selected.user_id ? " - signed-in user" : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={CONTACT_STATUS_META[selected.status].tone}>{CONTACT_STATUS_META[selected.status].label}</Badge>
            </div>
            <Card className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words p-4 text-sm">{selected.message}</Card>
            {error && <FormMessage kind="error" className="mt-3">{error}</FormMessage>}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={mailtoHref(selected)}
                onClick={() => selected.status !== "REPLIED" && setStatus(selected, "REPLIED")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <Reply aria-hidden className="size-4" /> Reply by email
              </a>
              {selected.status !== "READ" && (
                <Button variant="outline" loading={pending} onClick={() => setStatus(selected, "READ")}>
                  <MailOpen aria-hidden /> Mark read
                </Button>
              )}
              {selected.status !== "UNREAD" && (
                <Button variant="outline" loading={pending} onClick={() => setStatus(selected, "UNREAD")}>
                  <Mail aria-hidden /> Mark unread
                </Button>
              )}
              {selected.status !== "REPLIED" && (
                <Button variant="outline" loading={pending} onClick={() => setStatus(selected, "REPLIED")}>
                  <CheckCheck aria-hidden /> Mark replied
                </Button>
              )}
              {selected.status !== "ARCHIVED" && (
                <Button variant="outline" loading={pending} onClick={() => setStatus(selected, "ARCHIVED", { close: true })}>
                  <Archive aria-hidden /> Archive
                </Button>
              )}
              <ConfirmActionButton
                title="Delete this message?"
                description="This permanently removes the message."
                confirmLabel="Delete"
                variant="danger"
                size="md"
                action={() => deleteContactMessage(selected.id)}
                onDone={() => setSelected(null)}
              >
                <Trash2 aria-hidden /> Delete
              </ConfirmActionButton>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
