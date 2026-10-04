"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle, type ButtonProps } from "@/components/ui";
import type { ActionResult } from "./common";

/** Button that asks for confirmation, runs a server action and refreshes the page. */
export function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel,
  action,
  variant = "outline",
  size = "sm",
  children,
  onDone,
}: {
  label?: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionResult<object>>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  children?: React.ReactNode;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setOpen(false);
        onDone?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button variant={variant} size={size} aria-label={label} onClick={() => setOpen(true)}>
        {children ?? label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)} title={title}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} loading={pending} onClick={run}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
