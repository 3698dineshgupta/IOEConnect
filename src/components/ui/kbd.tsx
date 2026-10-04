import * as React from "react";
import { cn } from "@/lib/utils";

/** Keyboard key hint, e.g. <Kbd>⌘</Kbd><Kbd>K</Kbd>. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border-strong bg-muted px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border-strong)]",
        className,
      )}
      {...props}
    />
  );
}
