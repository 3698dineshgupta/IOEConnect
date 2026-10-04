import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  label,
  tone = "primary",
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  tone?: "primary" | "accent" | "success" | "danger";
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bar = { primary: "bg-linear-to-r from-primary-strong to-cyan-bright", accent: "bg-accent", success: "bg-success", danger: "bg-danger" }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}
