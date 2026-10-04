"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name (screen-reader only; render DialogTitle for a visible one). */
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, className, children }: DialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      wrapperClassName="items-center justify-center p-4"
      panelClassName={cn("max-h-[90dvh] w-full max-w-md animate-pop-in overflow-y-auto rounded-2xl border border-border p-5 sm:p-6", className)}
    >
      {children}
    </Modal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1 pr-8", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-bold tracking-[-0.02em]", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
