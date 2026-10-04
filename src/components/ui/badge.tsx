import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground ring-border",
        primary: "bg-primary-soft text-primary ring-primary/15",
        accent: "bg-accent-soft text-warning ring-accent/20",
        success: "bg-success-soft text-success ring-success/15",
        warning: "bg-warning-soft text-warning ring-warning/15",
        danger: "bg-danger-soft text-danger ring-danger/15",
        outline: "text-muted-foreground ring-border-strong",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
