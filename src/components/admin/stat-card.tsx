import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
  tone?: keyof typeof tones;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", tones[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-3 truncate text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-border bg-card p-5 shadow-sm";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-primary/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
