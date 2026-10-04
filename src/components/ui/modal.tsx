"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])';

const noopSubscribe = () => () => {};

/** Shared accessible modal layer used by Dialog and Sheet. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  panelClassName,
  wrapperClassName,
  hideClose,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  panelClassName?: string;
  wrapperClassName?: string;
  hideClose?: boolean;
  children?: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  React.useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChangeRef.current(false);
      } else if (e.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return e.preventDefault();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex", wrapperClassName)}>
      <div className="absolute inset-0 animate-fade-in bg-[#050b14]/50 backdrop-blur-[3px] dark:bg-[#020617]/70" onClick={() => onOpenChange(false)} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn("relative bg-surface-elevated text-card-foreground shadow-xl outline-none", panelClassName)}
      >
        <h2 id={`${id}-title`} className="sr-only">
          {title}
        </h2>
        {description && (
          <p id={`${id}-desc`} className="sr-only">
            {description}
          </p>
        )}
        {children}
        {!hideClose && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-2 top-2 inline-flex size-10 items-center sm:right-3 sm:top-3 sm:size-8 justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
