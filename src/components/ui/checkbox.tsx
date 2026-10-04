import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <span className={cn("relative inline-flex size-5 shrink-0", className)}>
      <input
        ref={ref}
        type="checkbox"
        className="peer size-5 cursor-pointer appearance-none rounded-[5px] border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <Check aria-hidden className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100" strokeWidth={3} />
    </span>
  ),
);
Checkbox.displayName = "Checkbox";
