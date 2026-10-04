"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@/components/ui";
import { deleteAllSyllabiAction } from "@/app/admin/bulk-upload/actions";

/**
 * The red "delete all syllabi" box and its confirm dialog. Only rendered for the Syllabus type.
 * Deletes only the selected program's syllabus resources.
 */
export function DeleteAllSyllabi({ programSlug, programName, count, busy, onDeleted }: { programSlug: string; programName: string; count: number; busy: boolean; onDeleted: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const plural = count === 1 ? "" : "s";

  async function run() {
    setDeleting(true);
    try {
      const res = await deleteAllSyllabiAction(programSlug);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const d = res.data;
      toast.success(
        d && d.deleted > 0
          ? `Deleted ${d.deleted} ${programName} syllabus resource${d.deleted === 1 ? "" : "s"}${d.telegramKept > 0 ? ` (${d.telegramKept} file${d.telegramKept === 1 ? "" : "s"} could not be removed from Telegram)` : ""}.`
          : `${programName} had no syllabi to delete.`,
      );
      setOpen(false);
      setText("");
      onDeleted();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (count === 0) return null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Delete the old {programName} syllabi first</p>
          <p className="mt-0.5 text-muted-foreground">
            Permanently removes the {count} existing syllabus resource{plural} of {programName} (database rows and the stored files). Other programs, notes and PYQs are not touched.
            Then drop the new folder below.
          </p>
        </div>
        <Button variant="danger" disabled={busy || deleting} onClick={() => { setText(""); setOpen(true); }}>
          Delete {programName} syllabi
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!deleting) setOpen(o); }} title={`Delete ${programName} syllabi`}>
        <DialogHeader>
          <DialogTitle>Delete all {count} {programName} syllab{count === 1 ? "us" : "i"}?</DialogTitle>
          <DialogDescription>
            This permanently deletes every syllabus resource of {programName} and its stored file. It cannot be undone. Students will see &ldquo;Coming soon&rdquo; for those Syllabus slots until you upload the new ones. Other programs are not affected.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <label htmlFor="del-confirm" className="mb-1.5 block text-sm font-medium">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <Input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" disabled={deleting} />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={deleting} disabled={text.trim() !== "DELETE" || deleting} onClick={() => void run()}>
            Delete permanently
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
