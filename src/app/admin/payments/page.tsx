import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { formatMoney } from "@/components/premium/constants";
import { FilterTabs, Pagination } from "@/components/premium/pagination";
import { methodLabel } from "@/lib/actions/premium";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/types";
import { ReviewButtons, ScreenshotButton, type AdminPaymentRowInfo } from "./payment-row-actions";

export const metadata: Metadata = { title: "Payments · Admin", robots: { index: false } };

const PAGE_SIZE = 20;
const FILTERS = ["pending", "approved", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Exclude<Filter, "all">, PaymentStatus> = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
};

type One<T> = T | T[] | null;
type Row = {
  id: string;
  amount: number | string;
  payment_method: string;
  transaction_reference: string | null;
  screenshot_path: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: One<{ full_name: string | null; email: string | null }>;
  reviewer: One<{ full_name: string | null; email: string | null }>;
  plan: One<{ name: string; duration_days: number }>;
  program: One<{ name: string; short_name: string | null }>;
};
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const STATUS_BADGE: Record<PaymentStatus, { label: string; variant: "warning" | "success" | "danger" }> = {
  PENDING: { label: "Pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "danger" },
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin("/admin/payments");
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "pending";
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const from = (page - 1) * PAGE_SIZE;

  const paymentSettings = await getSetting("payment");
  const currency = paymentSettings.currency;

  let rows: Row[] = [];
  let total = 0;
  let counts: Partial<Record<Filter, number | null>> = {};
  let loadError = false;

  try {
    const supabase = await createServerClient();
    let query = supabase
      .from("payments")
      .select(
        "id, amount, payment_method, transaction_reference, screenshot_path, status, rejection_reason, created_at, reviewed_at, " +
          "user:profiles!payments_user_id_fkey(full_name, email), " +
          "reviewer:profiles!payments_reviewed_by_fkey(full_name, email), " +
          "plan:premium_plans(name, duration_days), " +
          "program:programs(name, short_name)",
        { count: "exact" },
      )
      .order("created_at", { ascending: filter === "pending" })
      .range(from, from + PAGE_SIZE - 1);
    if (filter !== "all") query = query.eq("status", FILTER_STATUS[filter]);

    const countFor = (status?: PaymentStatus) => {
      let q = supabase.from("payments").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };

    const [list, pending, approved, rejected, all] = await Promise.all([
      query,
      countFor("PENDING"),
      countFor("APPROVED"),
      countFor("REJECTED"),
      countFor(),
    ]);
    if (list.error) throw list.error;
    rows = (list.data ?? []) as unknown as Row[];
    total = list.count ?? rows.length;
    counts = { pending: pending.count, approved: approved.count, rejected: rejected.count, all: all.count };
  } catch (err) {
    console.error("[admin/payments] load failed", err);
    loadError = true;
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (f: Filter, p = 1) => `/admin/payments?status=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify manual premium payments. Approving activates or extends premium; every review is audit-logged.
        </p>
      </div>

      <FilterTabs
        label="Filter payments by status"
        current={filter}
        hrefFor={(f) => hrefFor(f)}
        tabs={[
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
          { value: "all", label: "All", count: counts.all },
        ]}
      />

      {loadError ? (
        <EmptyState title="Couldn't load payments" description="Something went wrong while loading payments. Please refresh the page." />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CreditCard aria-hidden />}
          title={filter === "pending" ? "No payments waiting for review" : "No payments found"}
          description={filter === "pending" ? "New submissions will appear here." : "Try another filter."}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Screenshot</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const u = one(r.user);
                const plan = one(r.plan);
                const reviewer = one(r.reviewer);
                const amountLabel = formatMoney(r.amount, currency);
                const info: AdminPaymentRowInfo = {
                  id: r.id,
                  userLabel: u?.full_name || u?.email || "Unknown user",
                  planName: plan?.name ?? "Unknown plan",
                  amountLabel,
                  durationDays: plan?.duration_days ?? null,
                  hasScreenshot: !!r.screenshot_path,
                  reference: r.transaction_reference,
                };
                const badge = STATUS_BADGE[r.status];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="min-w-[12rem]">
                      <p className="font-medium">{u?.full_name || "—"}</p>
                      <p className="break-all text-xs text-muted-foreground">{u?.email ?? "—"}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{one(r.program)?.short_name ?? one(r.program)?.name ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {plan?.name ?? "—"}
                      {plan && <span className="block text-xs text-muted-foreground">{plan.duration_days} days</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{amountLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">{methodLabel(paymentSettings.methods, r.payment_method)}</TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs" title={r.transaction_reference ?? undefined}>
                      {r.transaction_reference ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{formatDate(r.created_at, { withTime: true })}</TableCell>
                    <TableCell className="min-w-[8rem]">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {r.reviewed_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(r.reviewed_at)}
                          {reviewer ? ` by ${reviewer.full_name || reviewer.email}` : ""}
                        </p>
                      )}
                      {r.status === "REJECTED" && r.rejection_reason && (
                        <p className="mt-1 max-w-[14rem] text-xs text-danger" title={r.rejection_reason}>
                          {r.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ScreenshotButton payment={info} />
                    </TableCell>
                    <TableCell>{r.status === "PENDING" ? <ReviewButtons payment={info} /> : null}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => hrefFor(filter, p)} label="Payments pages" />
        </>
      )}
    </div>
  );
}
