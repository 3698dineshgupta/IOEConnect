import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-md border border-input bg-card px-3 text-base text-foreground sm:text-sm shadow-xs placeholder:text-muted-foreground/70 transition-[border-color,box-shadow,background-color] duration-150 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/15 dark:bg-surface-sunken";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldClass, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";
