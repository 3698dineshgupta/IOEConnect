"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";

const sides = {
  right: { wrap: "justify-end", panel: "h-full w-[88%] max-w-sm animate-slide-in-right border-l" },
  left: { wrap: "justify-start", panel: "h-full w-[88%] max-w-sm animate-slide-in-left border-r" },
  bottom: { wrap: "items-end", panel: "w-full max-h-[85dvh] animate-slide-in-bottom rounded-t-2xl border-t" },
} as const;

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: keyof typeof sides;
  className?: string;
  children?: React.ReactNode;
}) {
  const s = sides[side];
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      wrapperClassName={s.wrap}
      panelClassName={cn("overflow-y-auto border-border p-5", s.panel, className)}
    >
      {children}
    </Modal>
  );
}
