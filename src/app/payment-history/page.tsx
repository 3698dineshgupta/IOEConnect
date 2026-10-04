import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, Crown, Receipt, XCircle } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import {
  Badge,
  Card,
  CardContent,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from "@/components/ui";
import { formatMoney } from "@/components/premium/constants";
import { isPremiumActive, premiumDaysLeft } from "@/lib/access";
import { methodLabel, toShellUser } from "@/lib/actions/premium";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { PageBackdrop, PageHeader } from "@/components/community/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import type { PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Payment history", robots: { index: false } };

type Row = {
  id: string;
  amount: number | string;
  payment_method: string;
  transaction_reference: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  plan: { name: string; duration_days: number } | { name: string; duration_days: number }[] | null;
};

const STATUS_UI: Record<PaymentStatus, { label: string; variant: "warning" | "success" | "danger"; icon: React.ReactNode }> = {
  PENDING: { label: "Pending review", variant: "warning", icon: <Clock aria-hidden /> },
  APPROVED: { label: "Verified", variant: "success", icon: <CheckCircle2 aria-hidden /> },
  REJECTED: { label: "Rejected", variant: "danger", icon: <XCircle aria-hidden /> },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const s = STATUS_UI[status];
  return (
    <Badge variant={s.variant}>
      {s.icon}
      {s.label}
    </Badge>
  );
}

export default async function PaymentHistoryPage() {
  const { user, profile } = await requireUser("/payment-history");
  const paymentSettings = await getSetting("payment");
  const currency = paymentSettings.currency;

  let rows: Row[] = [];
  let loadError = false;
  try {
    const supabase = await createServerClient();
    // screenshot_path intentionally NOT selected.
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, amount, payment_method, transaction_reference, status, rejection_reason, created_at, reviewed_at, plan:premium_plans(name, duration_days)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    rows = (data ?? []) as Row[];
  } catch (err) {
    console.error("[payment-history] load failed", err);
    loadError = true;
  }

  const active = isPremiumActive(profile);
  const daysLeft = premiumDaysLeft(profile);
  const planOf = (r: Row) => (Array.isArray(r.plan) ? r.plan[0] : r.plan);

  return (
    <PublicShell user={toShellUser(profile, user)}>
      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <PageBackdrop />
        <PageHeader
          className="mb-8"
          eyebrow="Premium"
          title="Payment history"
          description="Your premium payments and their verification status."
          actions={
            <Link href="/premium" className={buttonVariants({ variant: "accent" })}>
              <Crown aria-hidden /> {active ? "Extend premium" : "Get premium"}
            </Link>
          }
        />

        {active && profile?.premium_expires_at && (
          <Card className="mb-6 rounded-2xl border-success/40">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
              <p>
                Premium active until <strong>{formatDate(profile.premium_expires_at, { withTime: true })}</strong> ({daysLeft}{" "}
                {daysLeft === 1 ? "day" : "days"} left).
              </p>
            </CardContent>
          </Card>
        )}

        {loadError ? (
          <EmptyState
            title="Couldn't load your payments"
            description="Something went wrong on our side. Please refresh the page or try again in a moment."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Receipt aria-hidden />}
            title="No payments yet"
            description="When you buy a premium plan, your payment and its review status will show up here."
            action={
              <Link href="/premium" className={buttonVariants({ variant: "primary" })}>
                View plans
              </Link>
            }
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <Stagger as="ul" className="space-y-3 md:hidden">
              {rows.map((r) => {
                const plan = planOf(r);
                return (
                  <StaggerItem as="li" key={r.id}>
                    <Card className="rounded-2xl">
                      <CardContent className="space-y-2 p-4 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{plan?.name ?? "Premium plan"}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(r.created_at, { withTime: true })}</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                          <dt className="text-muted-foreground">Amount</dt>
                          <dd className="text-right font-medium">{formatMoney(r.amount, currency)}</dd>
                          <dt className="text-muted-foreground">Method</dt>
                          <dd className="text-right">{methodLabel(paymentSettings.methods, r.payment_method)}</dd>
                          {r.transaction_reference && (
                            <>
                              <dt className="text-muted-foreground">Reference</dt>
                              <dd className="break-all text-right font-mono text-xs">{r.transaction_reference}</dd>
                            </>
                          )}
                          {r.reviewed_at && (
                            <>
                              <dt className="text-muted-foreground">Reviewed</dt>
                              <dd className="text-right">{formatDate(r.reviewed_at)}</dd>
                            </>
                          )}
                        </dl>
                        {r.status === "REJECTED" && r.rejection_reason && (
                          <p className="rounded-md bg-danger-soft px-3 py-2 text-xs">
                            <span className="font-semibold">Reason:</span> {r.rejection_reason}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const plan = planOf(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(r.created_at, { withTime: true })}</TableCell>
                        <TableCell>{plan?.name ?? "Premium plan"}</TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">{formatMoney(r.amount, currency)}</TableCell>
                        <TableCell>{methodLabel(paymentSettings.methods, r.payment_method)}</TableCell>
                        <TableCell className="max-w-[12rem] truncate font-mono text-xs" title={r.transaction_reference ?? undefined}>
                          {r.transaction_reference ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <StatusBadge status={r.status} />
                            {r.status === "REJECTED" && r.rejection_reason && (
                              <p className="max-w-xs text-xs text-danger">{r.rejection_reason}</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </PublicShell>
  );
}
