import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-[-0.005em] select-none transition-[background-color,border-color,color,box-shadow,transform,filter] duration-200 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-strong text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(7_17_31/0.18),0_8px_20px_-8px_rgb(37_99_235/0.6)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(7_17_31/0.18),0_12px_28px_-8px_rgb(37_99_235/0.7)]",
        accent:
          "bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_6px_16px_-8px_rgb(245_158_11/0.6)] hover:bg-accent-hover",
        secondary: "bg-muted text-foreground ring-1 ring-inset ring-border hover:bg-surface-elevated hover:ring-border-strong",
        outline:
          "border border-border-strong bg-card/70 text-foreground shadow-xs hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border-strong))] hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-[#dc2626] text-white shadow-sm hover:brightness-110",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        sm: "h-10 rounded-lg px-3.5 text-xs sm:h-8 sm:px-3",
        md: "h-11 px-4 sm:h-10",
        lg: "h-12 rounded-xl px-6 text-[0.9375rem]",
        icon: "size-11 sm:size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Drift slightly toward the pointer (desktop only, off under reduced motion). */
  magnetic?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, magnetic, disabled, children, type = "button", ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Spinner className="size-4" />}
        {children}
      </button>
    );
    return magnetic ? <MagneticButton>{button}</MagneticButton> : button;
  },
);
Button.displayName = "Button";
