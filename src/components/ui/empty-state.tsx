import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-card/50 px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-[0_8px_24px_-10px_var(--glow-strong)] ring-1 ring-primary/15 [&_svg]:size-6">
        {icon ?? <Inbox aria-hidden />}
      </div>
      <h3 className="text-base font-bold tracking-[-0.015em]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
