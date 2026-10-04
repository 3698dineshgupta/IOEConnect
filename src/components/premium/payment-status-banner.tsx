import Link from "next/link";
import { CheckCircle2, Clock, Crown, XCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";

export interface LatestPaymentSummary {
  id: string;
  status: PaymentStatus;
  planName: string | null;
  amountLabel: string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

const tone = {
  PENDING: "border-warning/40 bg-warning-soft text-foreground",
  APPROVED: "border-success/40 bg-success-soft text-foreground",
  REJECTED: "border-danger/40 bg-danger-soft text-foreground",
} as const;

/** Current payment / premium status shown at the top of /premium. */
export function PaymentStatusBanner({
  payment,
  premiumActive,
  premiumExpiresAt,
  daysLeft,
}: {
  payment: LatestPaymentSummary | null;
  premiumActive: boolean;
  premiumExpiresAt: string | null;
  daysLeft: number;
}) {
  if (payment?.status === "PENDING") {
    return (
      <div role="status" className={cn("flex gap-3 rounded-xl border p-4", tone.PENDING)}>
        <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">
            <span aria-hidden>🟡 </span>Pending review
          </p>
          <p className="mt-1 text-muted-foreground">
            Your {payment.planName ? <strong className="text-foreground">{payment.planName}</strong> : "premium"} payment
            of {payment.amountLabel} was submitted on {formatDate(payment.createdAt, { withTime: true })}. We verify
            payments manually, usually within 24 hours.
          </p>
          <Link href="/payment-history" className="mt-2 inline-block link-underline font-medium text-primary">
            View payment history
          </Link>
        </div>
      </div>
    );
  }

  if (premiumActive) {
    return (
      <div role="status" className={cn("flex gap-3 rounded-xl border p-4", tone.APPROVED)}>
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">
            <span aria-hidden>🟢 </span>Premium active
          </p>
          <p className="mt-1 text-muted-foreground">
            Your premium is valid until <strong className="text-foreground">{formatDate(premiumExpiresAt, { withTime: true })}</strong>{" "}
            ({daysLeft} {daysLeft === 1 ? "day" : "days"} left). Buying another plan extends it from your current expiry.
          </p>
        </div>
      </div>
    );
  }

  if (payment?.status === "REJECTED") {
    return (
      <div role="alert" className={cn("flex gap-3 rounded-xl border p-4", tone.REJECTED)}>
        <XCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">
            <span aria-hidden>🔴 </span>Payment rejected
          </p>
          <p className="mt-1 text-muted-foreground">
            Your payment from {formatDate(payment.createdAt)} could not be verified.
          </p>
          {payment.rejectionReason && (
            <p className="mt-2 break-words rounded-md bg-card/70 px-3 py-2">
              <span className="font-medium">Reason:</span> {payment.rejectionReason}
            </p>
          )}
          <p className="mt-2 text-muted-foreground">You can submit a new payment below.</p>
        </div>
      </div>
    );
  }

  if (payment?.status === "APPROVED" && premiumExpiresAt) {
    return (
      <div role="status" className="flex gap-3 rounded-lg border border-border bg-muted/50 p-4">
        <Crown aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-semibold">Your premium has expired</p>
          <p className="mt-1 text-muted-foreground">It ended on {formatDate(premiumExpiresAt)}. Renew below to regain access.</p>
        </div>
      </div>
    );
  }

  return null;
}
