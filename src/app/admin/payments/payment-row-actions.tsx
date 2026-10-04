"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Eye, ImageOff, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Textarea,
} from "@/components/ui";
import { approvePayment, getPaymentScreenshotUrl, rejectPayment } from "@/lib/actions/payments";

export interface AdminPaymentRowInfo {
  id: string;
  userLabel: string;
  planName: string;
  amountLabel: string;
  durationDays: number | null;
  hasScreenshot: boolean;
  reference: string | null;
}

/** View screenshot (any status). */
export function ScreenshotButton({ payment }: { payment: AdminPaymentRowInfo }) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setUrl(null);
    const res = await getPaymentScreenshotUrl(payment.id);
    setLoading(false);
    if (res.ok) setUrl(res.data.url);
    else setError(res.error);
  }

  if (!payment.hasScreenshot) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ImageOff aria-hidden className="size-3.5" /> None
      </span>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={load} aria-label={`View screenshot for payment by ${payment.userLabel}`}>
        <Eye aria-hidden /> View
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Payment screenshot" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment screenshot</DialogTitle>
          <DialogDescription>
            {payment.userLabel} · {payment.planName} · {payment.amountLabel}
            {payment.reference ? ` · Ref ${payment.reference}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-64 items-center justify-center rounded-lg bg-muted/50">
          {loading && <Spinner label="Loading screenshot" />}
          {error && <p className="p-6 text-center text-sm text-danger">{error}</p>}
          {url && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img
              src={url}
              alt={`Payment screenshot submitted by ${payment.userLabel}`}
              className="max-h-[70vh] w-auto rounded-md object-contain"
              onError={() => {
                setUrl(null);
                setError("The link expired or the image could not be loaded. Close and reopen to try again.");
              }}
            />
          )}
        </div>
        <DialogFooter>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline sm:mr-auto sm:self-center">
              Open full size (link valid 60s)
            </a>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

/** Approve / reject buttons for PENDING payments. */
export function ReviewButtons({ payment }: { payment: AdminPaymentRowInfo }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"approve" | "reject" | null>(null);
  const [expiry, setExpiry] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const ids = React.useId();

  function close() {
    if (pending) return;
    setMode(null);
    setFieldError(null);
  }

  function onApprove() {
    let expiryIso: string | null = null;
    if (expiry) {
      const d = new Date(expiry);
      if (Number.isNaN(d.getTime())) return setFieldError("Enter a valid date and time.");
      if (d.getTime() <= Date.now()) return setFieldError("The expiry must be in the future.");
      expiryIso = d.toISOString();
    }
    setFieldError(null);
    startTransition(async () => {
      const res = await approvePayment({ paymentId: payment.id, expiryOverride: expiryIso });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const extra =
        res.data.referral === "rewarded"
          ? " Referral reward granted."
          : res.data.referral === "qualified"
            ? " Referral marked qualified."
            : "";
      toast.success(`Approved. Premium active until ${new Date(res.data.premiumExpiresAt).toLocaleString()}.${extra}`);
      setMode(null);
      setExpiry("");
      router.refresh();
    });
  }

  function onReject() {
    const r = reason.trim();
    if (r.length < 3) return setFieldError("Please give a reason (at least 3 characters).");
    setFieldError(null);
    startTransition(async () => {
      const res = await rejectPayment({ paymentId: payment.id, reason: r });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment rejected. The user will see your reason.");
      setMode(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="primary" onClick={() => setMode("approve")} aria-label={`Approve payment by ${payment.userLabel}`}>
        <Check aria-hidden /> Approve
      </Button>
      <Button size="sm" variant="outline" className="text-danger" onClick={() => setMode("reject")} aria-label={`Reject payment by ${payment.userLabel}`}>
        <X aria-hidden /> Reject
      </Button>

      <Dialog open={mode === "approve"} onOpenChange={(o) => (o ? setMode("approve") : close())} title="Approve payment">
        <DialogHeader>
          <DialogTitle>Approve this payment?</DialogTitle>
          <DialogDescription>
            {payment.userLabel} will get <strong>{payment.planName}</strong>
            {payment.durationDays ? ` (${payment.durationDays} days)` : ""} for {payment.amountLabel}. If they already have
            active premium it is extended from the current expiry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-expiry`}>Expiry override (optional)</Label>
          <Input
            id={`${ids}-expiry`}
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={`${ids}-expiry-hint`}
            disabled={pending}
          />
          <p id={`${ids}-expiry-hint`} className="text-xs text-muted-foreground">
            Leave empty to use the plan duration. Times are in your local timezone.
          </p>
          {fieldError && (
            <p role="alert" className="text-sm text-danger">
              {fieldError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onApprove} loading={pending}>
            Approve payment
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={mode === "reject"} onOpenChange={(o) => (o ? setMode("reject") : close())} title="Reject payment">
        <DialogHeader>
          <DialogTitle>Reject this payment?</DialogTitle>
          <DialogDescription>
            {payment.userLabel} · {payment.planName} · {payment.amountLabel}. The reason is shown to the user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-reason`}>Reason</Label>
          <Textarea
            id={`${ids}-reason`}
            data-autofocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Transaction ID not found, or amount does not match the plan price."
            maxLength={1000}
            required
            aria-invalid={fieldError ? true : undefined}
            disabled={pending}
          />
          {fieldError && (
            <p role="alert" className="text-sm text-danger">
              {fieldError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onReject} loading={pending}>
            Reject payment
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
