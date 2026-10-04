"use client";

import * as React from "react";
import { Bug } from "lucide-react";
import { Button, Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui";
import { BugReportForm } from "./BugReportForm";

/**
 * "Report a bug" trigger + dialog. Drop it anywhere (footer, floating corner):
 *   <ReportBugDialog />                       default outline button
 *   <ReportBugDialog>Report a bug</ReportBugDialog>   custom label
 *   <ReportBugDialog floating />              fixed bottom-right icon button
 * It resolves the signed-in user itself (for screenshot upload), no props needed.
 */
export function ReportBugDialog({
  children,
  floating,
  className,
  variant = "outline",
}: {
  children?: React.ReactNode;
  floating?: boolean;
  className?: string;
  variant?: "outline" | "ghost" | "secondary" | "link";
}) {
  const [open, setOpen] = React.useState(false);
  // Remount the form each time so state/auto-captured metadata are fresh.
  const [session, setSession] = React.useState(0);

  return (
    <>
      {floating ? (
        <button
          type="button"
          aria-label="Report a bug"
          onClick={() => {
            setSession((s) => s + 1);
            setOpen(true);
          }}
          className={
            "fixed bottom-20 right-4 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 " +
            (className ?? "")
          }
        >
          <Bug aria-hidden className="size-5" />
        </button>
      ) : (
        <Button
          variant={variant}
          size="sm"
          className={className}
          onClick={() => {
            setSession((s) => s + 1);
            setOpen(true);
          }}
        >
          {children ?? (
            <>
              <Bug aria-hidden /> Report a bug
            </>
          )}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Report a bug" className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription>Something not working? Tell us and we will look into it.</DialogDescription>
        </DialogHeader>
        {open && <BugReportForm key={session} idPrefix="bugdlg" />}
      </Dialog>
    </>
  );
}
