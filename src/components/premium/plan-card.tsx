import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "./constants";

export interface PlanView {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string | null;
  benefits: string[];
}

export function durationLabel(days: number): string {
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? "1 month" : `${days / 30} months`;
  if (days % 7 === 0) return days === 7 ? "1 week" : `${days / 7} weeks`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Presentational plan summary. Selection state is handled by the caller. */
export function PlanCardBody({
  plan,
  currency,
  selected = false,
  bestValue = false,
}: {
  plan: PlanView;
  currency: string;
  selected?: boolean;
  bestValue?: boolean;
}) {
  const perDay = plan.duration_days > 0 ? plan.price / plan.duration_days : null;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold tracking-[-0.02em]">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{durationLabel(plan.duration_days)}</p>
        </div>
        {bestValue && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-warning ring-1 ring-accent/30">Best value</span>
        )}
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-[-0.035em] tabular-nums">{formatMoney(plan.price, currency)}</p>
      {perDay != null && plan.price > 0 && (
        <p className="text-xs text-muted-foreground">≈ {formatMoney(Math.round(perDay * 100) / 100, currency)} / day</p>
      )}
      {plan.description && <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>}
      {plan.benefits.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          {plan.benefits.map((b) => (
            <li key={b} className="flex gap-2">
              <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", selected ? "text-primary" : "text-success")} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Index of the plan with the lowest price per day (only when there are 3+ plans). */
export function bestValueIndex(plans: PlanView[]): number {
  if (plans.length < 3) return -1;
  let best = -1;
  let bestRate = Infinity;
  plans.forEach((p, i) => {
    if (p.duration_days <= 0 || p.price <= 0) return;
    const rate = p.price / p.duration_days;
    if (rate < bestRate) {
      bestRate = rate;
      best = i;
    }
  });
  return best;
}
