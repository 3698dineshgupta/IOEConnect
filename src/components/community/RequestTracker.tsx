import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

const STEPS: { key: RequestStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
];

/** Pending -> In progress -> Completed / Rejected */
export function RequestTracker({ status }: { status: RequestStatus }) {
  const rejected = status === "REJECTED";
  const idx = rejected ? 1 : STEPS.findIndex((s) => s.key === status);
  const steps = rejected ? [STEPS[0], { key: "REJECTED" as RequestStatus, label: "Rejected" }] : STEPS;
  return (
    <ol className="flex items-center gap-2" aria-label="Request progress">
      {steps.map((s, i) => {
        const done = i <= idx;
        const isBad = rejected && s.key === "REJECTED";
        return (
          <li key={s.key} className="flex items-center gap-2" aria-current={i === idx ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                isBad ? "bg-danger text-white" : done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {isBad ? <X aria-hidden className="size-3.5" /> : done && i < idx ? <Check aria-hidden className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("whitespace-nowrap text-xs font-medium", done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            {i < steps.length - 1 && <span aria-hidden className={cn("h-0.5 w-6 sm:w-10", i < idx ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
