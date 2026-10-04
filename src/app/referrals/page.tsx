import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Hourglass, Trophy, UserPlus, Users } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  buttonVariants,
} from "@/components/ui";
import { CopyField } from "@/components/premium/copy-field";
import { formatMoney } from "@/components/premium/constants";
import { maskEmail, toShellUser } from "@/lib/actions/premium";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import { formatDate, siteUrl } from "@/lib/utils";
import type { ReferralStatus } from "@/lib/types";
import { PageBackdrop, PageHeader } from "@/components/community/page-header";
import { CountUp, Stagger, StaggerItem } from "@/components/motion";

export const metadata: Metadata = { title: "Referrals", robots: { index: false } };

type Row = { id: string; referred_id: string; status: ReferralStatus; reward_amount: number | string; created_at: string };

const STATUS_UI: Record<ReferralStatus, { label: string; variant: "neutral" | "primary" | "success"; hint: string }> = {
  PENDING: { label: "Joined", variant: "neutral", hint: "Signed up, hasn't bought premium yet" },
  QUALIFIED: { label: "Qualified", variant: "primary", hint: "Bought premium, reward being processed" },
  REWARDED: { label: "Rewarded", variant: "success", hint: "Reward credited" },
};

export default async function ReferralsPage() {
  const { user, profile } = await requireUser("/referrals");
  const [referralSettings, paymentSettings] = await Promise.all([getSetting("referral"), getSetting("payment")]);
  const currency = paymentSettings.currency;

  let rows: (Row & { maskedEmail: string })[] = [];
  let loadError = false;
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("referrals")
      .select("id, referred_id, status, reward_amount, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const list = (data ?? []) as Row[];

    // Referred users' profiles are not readable by the referrer under RLS; read
    // only their emails server-side (scoped to this user's referrals) and mask.
    const emails = new Map<string, string | null>();
    if (list.length > 0) {
      const { data: people, error: peopleError } = await createAdminClient()
        .from("profiles")
        .select("id, email")
        .in(
          "id",
          list.map((r) => r.referred_id),
        );
      if (peopleError) console.error("[referrals] referred emails failed", peopleError);
      for (const p of (people ?? []) as { id: string; email: string | null }[]) emails.set(p.id, p.email);
    }
    rows = list.map((r) => ({ ...r, maskedEmail: maskEmail(emails.get(r.referred_id)) }));
  } catch (err) {
    console.error("[referrals] load failed", err);
    loadError = true;
  }

  const code = profile?.referral_code ?? "";
  const link = code ? siteUrl(`/register?ref=${encodeURIComponent(code)}`) : "";
  const total = rows.length;
  const qualified = rows.filter((r) => r.status === "QUALIFIED").length;
  const rewarded = rows.filter((r) => r.status === "REWARDED").length;
  const earnedAmount = rows
    .filter((r) => r.status === "REWARDED")
    .reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);

  const rewardParts: string[] = [];
  if (referralSettings.reward_days > 0)
    rewardParts.push(`${referralSettings.reward_days} bonus premium ${referralSettings.reward_days === 1 ? "day" : "days"}`);
  if (referralSettings.reward_amount > 0) rewardParts.push(formatMoney(referralSettings.reward_amount, currency));

  return (
    <PublicShell user={toShellUser(profile, user)}>
      <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
        <PageBackdrop />
        <PageHeader
          className="mb-8"
          eyebrow="Referrals"
          title="Invite friends"
          description={referralSettings.description || "Share your referral link. When friends buy premium, you earn rewards."}
        />

        {!referralSettings.enabled && (
          <div role="status" className="mb-6 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm">
            The referral program is paused right now. Your existing referrals are safe, but new ones won&apos;t earn rewards
            until it&apos;s back.
          </div>
        )}

        <Card className="ring-gradient mb-8 rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift aria-hidden className="size-5 text-accent" /> Your referral link
            </CardTitle>
            <CardDescription>
              {rewardParts.length > 0
                ? `You get ${rewardParts.join(" + ")} for every friend who signs up with your link and buys premium.`
                : "Friends sign up with your link or code. Rewards are announced by the IOE Connect team."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {code ? (
              <>
                <CopyField
                  label="Referral link"
                  value={link}
                  shareText={`Join me on IOE Connect for IOE notes and past questions. Use my code ${code} when you sign up.`}
                />
                <CopyField label="Referral code" value={code} mono />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Your referral code isn&apos;t ready yet. Please refresh in a moment.</p>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="ref-stats" className="mb-8">
          <h2 id="ref-stats" className="sr-only">
            Referral stats
          </h2>
          <Stagger as="div" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Users aria-hidden />} label="Total referrals" value={total} />
            <Stat icon={<Hourglass aria-hidden />} label="Qualified" value={qualified} />
            <Stat icon={<Trophy aria-hidden />} label="Rewarded" value={rewarded} />
            <Stat
              icon={<Gift aria-hidden />}
              label={earnedAmount > 0 ? "Reward earned" : "Bonus days / referral"}
              value={earnedAmount > 0 ? formatMoney(earnedAmount, currency) : referralSettings.reward_days}
            />
          </Stagger>
        </section>

        <section aria-labelledby="ref-list">
          <h2 id="ref-list" className="mb-3 text-lg font-bold tracking-[-0.02em]">
            Your referrals
          </h2>
          {loadError ? (
            <EmptyState title="Couldn't load your referrals" description="Something went wrong. Please refresh the page." />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<UserPlus aria-hidden />}
              title="No referrals yet"
              description="Share your link with classmates. They'll show up here as soon as they sign up."
              action={
                <Link href="/premium" className={buttonVariants({ variant: "outline" })}>
                  See what premium includes
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {rows.map((r) => {
                const s = STATUS_UI[r.status];
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.maskedEmail}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(r.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={s.variant} title={s.hint}>
                        {s.label}
                      </Badge>
                      {r.status !== "PENDING" && Number(r.reward_amount) > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{formatMoney(r.reward_amount, currency)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Joined: signed up with your link · Qualified: bought premium · Rewarded: your reward has been credited.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <StaggerItem as="div" className="card-lift rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary ring-1 ring-primary/10 [&_svg]:size-4">{icon}</div>
      <dl>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-2xl font-extrabold tracking-[-0.03em] tabular-nums">
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </dd>
      </dl>
    </StaggerItem>
  );
}
