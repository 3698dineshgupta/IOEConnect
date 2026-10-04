import type { Metadata } from "next";
import { Gift } from "lucide-react";
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
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { ReferralStatus } from "@/lib/types";
import { MarkRewardedButton } from "./mark-rewarded-button";
import { ReferralSettingsForm } from "./referral-settings-form";

export const metadata: Metadata = { title: "Referrals · Admin", robots: { index: false } };

const PAGE_SIZE = 25;
const FILTERS = ["all", "pending", "qualified", "rewarded"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_STATUS: Record<Exclude<Filter, "all">, ReferralStatus> = {
  pending: "PENDING",
  qualified: "QUALIFIED",
  rewarded: "REWARDED",
};

type Person = { full_name: string | null; email: string | null; referral_code?: string | null };
type One<T> = T | T[] | null;
type Row = {
  id: string;
  status: ReferralStatus;
  reward_amount: number | string;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  referrer: One<Person>;
  referred: One<Person>;
};
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
const personLabel = (p: Person | null) => p?.full_name || p?.email || "Unknown user";

const STATUS_BADGE: Record<ReferralStatus, { label: string; variant: "neutral" | "primary" | "success" }> = {
  PENDING: { label: "Pending", variant: "neutral" },
  QUALIFIED: { label: "Qualified", variant: "primary" },
  REWARDED: { label: "Rewarded", variant: "success" },
};

export default async function AdminReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin("/admin/referrals");
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "all";
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));
  const from = (page - 1) * PAGE_SIZE;

  const [referralSettings, paymentSettings] = await Promise.all([getSetting("referral"), getSetting("payment")]);
  const currency = paymentSettings.currency;

  let rows: Row[] = [];
  let total = 0;
  let counts: Partial<Record<Filter, number | null>> = {};
  let loadError = false;

  try {
    const supabase = await createServerClient();
    let query = supabase
      .from("referrals")
      .select(
        "id, status, reward_amount, payment_id, created_at, updated_at, " +
          "referrer:profiles!referrals_referrer_id_fkey(full_name, email, referral_code), " +
          "referred:profiles!referrals_referred_id_fkey(full_name, email)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (filter !== "all") query = query.eq("status", FILTER_STATUS[filter]);

    const countFor = (status?: ReferralStatus) => {
      let q = supabase.from("referrals").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      return q;
    };
    const [list, all, pending, qualified, rewarded] = await Promise.all([
      query,
      countFor(),
      countFor("PENDING"),
      countFor("QUALIFIED"),
      countFor("REWARDED"),
    ]);
    if (list.error) throw list.error;
    rows = (list.data ?? []) as unknown as Row[];
    total = list.count ?? rows.length;
    counts = { all: all.count, pending: pending.count, qualified: qualified.count, rewarded: rewarded.count };
  } catch (err) {
    console.error("[admin/referrals] load failed", err);
    loadError = true;
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (f: Filter, p = 1) => `/admin/referrals?status=${f}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure referral rewards and track every referral.</p>
      </div>

      <ReferralSettingsForm initial={referralSettings} currency={currency} />

      <section aria-labelledby="referral-transactions" className="space-y-4">
        <h2 id="referral-transactions" className="text-lg font-semibold">
          Referral transactions
        </h2>
        <FilterTabs
          label="Filter referrals by status"
          current={filter}
          hrefFor={(f) => hrefFor(f)}
          tabs={[
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "qualified", label: "Qualified", count: counts.qualified },
            { value: "rewarded", label: "Rewarded", count: counts.rewarded },
          ]}
        />

        {loadError ? (
          <EmptyState title="Couldn't load referrals" description="Something went wrong. Please refresh the page." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Gift aria-hidden />}
            title="No referrals found"
            description={filter === "all" ? "Referrals appear when users sign up with someone's code." : "Try another filter."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Referred user</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Reward</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const referrer = one(r.referrer);
                  const referred = one(r.referred);
                  const badge = STATUS_BADGE[r.status];
                  const rewardLabel = formatMoney(r.reward_amount, currency);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="min-w-[12rem]">
                        <p className="font-medium">{personLabel(referrer)}</p>
                        <p className="break-all text-xs text-muted-foreground">
                          {referrer?.email ?? "—"}
                          {referrer?.referral_code ? ` · ${referrer.referral_code}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[12rem]">
                        <p className="font-medium">{personLabel(referred)}</p>
                        <p className="break-all text-xs text-muted-foreground">{referred?.email ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{rewardLabel}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(r.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatDate(r.updated_at, { withTime: true })}</TableCell>
                      <TableCell>
                        {r.status === "QUALIFIED" ? (
                          <MarkRewardedButton referralId={r.id} referrerLabel={personLabel(referrer)} rewardLabel={rewardLabel} />
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => hrefFor(filter, p)} label="Referral pages" />
          </>
        )}
      </section>
    </div>
  );
}
