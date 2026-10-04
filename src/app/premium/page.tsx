import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Crown, History, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, CardContent, EmptyState, buttonVariants } from "@/components/ui";
import { formatMoney } from "@/components/premium/constants";
import { PaymentForm, PaymentFormUnavailable, type ProgramOption } from "@/components/premium/payment-form";
import { PaymentStatusBanner, type LatestPaymentSummary } from "@/components/premium/payment-status-banner";
import { PlanCardBody, bestValueIndex, type PlanView } from "@/components/premium/plan-card";
import { isPremiumActive, premiumDaysLeft } from "@/lib/access";
import { normalizePlan, resolvePaymentMethods, toShellUser } from "@/lib/actions/premium";
import { getProfile, getSessionUser } from "@/lib/auth";
import { getProgramAccess } from "@/lib/program-premium";
import { getSetting } from "@/lib/settings";
import { createServerClient } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem, TiltCard } from "@/components/motion";
import { PageBackdrop } from "@/components/community/page-header";
import type { PaymentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Premium",
  description: "Unlock premium notes and past questions on IOE Connect. Simple manual payment with eSewa, Khalti or bank transfer.",
};

async function loadPlans(): Promise<{ plans: PlanView[]; error: boolean }> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("premium_plans")
      .select("id, name, price, duration_days, description, benefits, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("price", { ascending: true });
    if (error) throw error;
    return {
      plans: (data ?? []).map((row) => {
        const p = normalizePlan(row);
        return { id: p.id, name: p.name, price: p.price, duration_days: p.duration_days, description: p.description, benefits: p.benefits };
      }),
      error: false,
    };
  } catch (err) {
    console.error("[premium] failed to load plans", err);
    return { plans: [], error: true };
  }
}

async function loadPrograms(): Promise<ProgramOption[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("programs")
      .select("id, name, short_name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, shortName: (p.short_name as string | null) ?? null }));
  } catch (err) {
    console.error("[premium] failed to load programs", err);
    return [];
  }
}

type PaymentRow = {
  id: string;
  status: PaymentStatus;
  amount: number | string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  plan: { name: string } | { name: string }[] | null;
};

async function loadLatestPayment(userId: string, currency: string): Promise<LatestPaymentSummary | null> {
  try {
    const supabase = await createServerClient();
    // A pending payment always wins; otherwise show the most recent one.
    const select = "id, status, amount, created_at, reviewed_at, rejection_reason, plan:premium_plans(name)";
    const { data: pending } = await supabase
      .from("payments")
      .select(select)
      .eq("user_id", userId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PaymentRow>();
    let row = pending;
    if (!row) {
      const { data, error } = await supabase
        .from("payments")
        .select(select)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<PaymentRow>();
      if (error) throw error;
      row = data;
    }
    if (!row) return null;
    const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
    return {
      id: row.id,
      status: row.status,
      planName: plan?.name ?? null,
      amountLabel: formatMoney(row.amount, currency),
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
    };
  } catch (err) {
    console.error("[premium] failed to load latest payment", err);
    return null;
  }
}

export default async function PremiumPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sp = await searchParams;
  const [user, profile, premiumSettings, paymentSettings, { plans, error: plansError }] = await Promise.all([
    getSessionUser(),
    getProfile(),
    getSetting("premium"),
    getSetting("payment"),
    loadPlans(),
  ]);

  const currency = paymentSettings.currency || premiumSettings.currency;
  // Premium is per program: list the programs this account has unlocked and when each expires.
  const [programs, access] = await Promise.all([
    loadPrograms(),
    user ? getProgramAccess(user.id) : Promise.resolve({ legacy: true, programs: [] as { programId: string; startedAt: string; expiresAt: string }[] }),
  ]);
  const expiryByProgram = new Map(access.programs.map((a) => [a.programId, a.expiresAt]));
  const unlocked = programs.filter((p) => expiryByProgram.has(p.id)).map((p) => ({ ...p, expiresAt: expiryByProgram.get(p.id)! }));
  const active = access.legacy ? isPremiumActive(profile) : unlocked.length > 0;
  const latestExpiry = access.legacy ? (profile?.premium_expires_at ?? null) : (unlocked.map((p) => p.expiresAt).sort().at(-1) ?? null);
  const daysLeft = premiumDaysLeft({ is_premium: active, premium_expires_at: latestExpiry });
  const latest = user ? await loadLatestPayment(user.id, currency) : null;
  const hasPending = latest?.status === "PENDING";
  const methods = user && !hasPending && premiumSettings.enabled ? await resolvePaymentMethods(paymentSettings.methods) : [];
  const best = bestValueIndex(plans);

  return (
    <PublicShell user={toShellUser(profile, user)}>
      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 sm:py-14">
        <PageBackdrop />
        {/* Hero */}
        <Reveal as="header" y={12} className="mb-10 text-center sm:mb-12">
          <Badge variant="accent" className="mb-4">
            <Crown aria-hidden /> IOE Connect Premium
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
            {active ? "You're a premium member" : <>Study smarter with <span className="text-gradient">Premium</span></>}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {active
              ? "Thanks for supporting IOE Connect. Premium is per program: extend it, or unlock another program, any time."
              : "Unlock the premium notes and past questions of your program. Pay with your favourite wallet and we'll activate it after a quick manual check."}
          </p>
        </Reveal>

        {active && latestExpiry && (
          <Card className="mb-6 overflow-hidden rounded-2xl border-success/40 shadow-md">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
                  <Sparkles aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Premium active</p>
                  {unlocked.length > 0 ? (
                    <ul className="text-sm text-muted-foreground">
                      {unlocked.map((p) => (
                        <li key={p.id}>
                          <span className="font-medium text-foreground">{p.shortName ?? p.name}</span> until {formatDate(p.expiresAt, { withTime: true })}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Expires {formatDate(latestExpiry, { withTime: true })}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
                <CalendarClock aria-hidden className="size-5 text-primary" />
                <span className="text-2xl font-bold tabular-nums">{daysLeft}</span>
                <span className="text-sm text-muted-foreground">{daysLeft === 1 ? "day left" : "days left"}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (
          <div className="mb-8 space-y-3">
            <PaymentStatusBanner
              payment={latest}
              premiumActive={active && !hasPending}
              premiumExpiresAt={latestExpiry}
              daysLeft={daysLeft}
            />
            {latest && (
              <div className="text-right">
                <Link href="/payment-history" className={cn(buttonVariants({ variant: "link", size: "sm" }))}>
                  <History aria-hidden /> Payment history
                </Link>
              </div>
            )}
          </div>
        )}

        {premiumSettings.benefits.length > 0 && (
          <section aria-labelledby="benefits-heading" className="mb-10">
            <h2 id="benefits-heading" className="sr-only">
              What you get
            </h2>
            <Stagger as="ul" className="grid gap-3 sm:grid-cols-3">
              {premiumSettings.benefits.map((b) => (
                <StaggerItem as="li" key={b} className="card-lift flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft">
                    <Sparkles aria-hidden className="size-4 text-accent" />
                  </span>
                  <span className="pt-0.5">{b}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}

        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-5 text-2xl font-extrabold tracking-[-0.025em]">
            {active ? "Extend or add a program" : "Get premium"}
          </h2>

          {plansError ? (
            <EmptyState
              title="Plans couldn't be loaded"
              description="Something went wrong while loading premium plans. Please refresh the page or try again later."
            />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={<Crown aria-hidden />}
              title="No plans available right now"
              description="Premium plans will appear here once they're published. Please check back soon."
            />
          ) : !premiumSettings.enabled ? (
            <PaymentFormUnavailable
              title="Premium purchases are paused"
              description="We're not accepting new payments right now. Please check back later."
            />
          ) : !user ? (
            <>
              <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p, i) => (
                  <StaggerItem key={p.id}>
                    <TiltCard className="h-full rounded-2xl" glare={i === best}>
                      <Card className={cn("h-full rounded-2xl p-6", i === best && "ring-gradient border-primary/40 shadow-glow")}>
                        <PlanCardBody plan={p} currency={currency} bestValue={i === best} />
                      </Card>
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <p className="font-medium">Log in to buy premium</p>
                <p className="text-sm text-muted-foreground">You need an account so we can activate premium for you.</p>
                <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
                  <Link href="/login?next=/premium" className={buttonVariants({ variant: "primary" })}>
                    Log in
                  </Link>
                  <Link href="/register" className={buttonVariants({ variant: "outline" })}>
                    Create account
                  </Link>
                </div>
              </div>
            </>
          ) : hasPending ? (
            <PaymentFormUnavailable
              title="Payment under review"
              description="You already have a payment waiting for verification. You'll be able to submit another once it's reviewed."
            />
          ) : methods.length === 0 ? (
            <PaymentFormUnavailable
              title="No payment methods available"
              description="Payment methods haven't been set up yet. Please contact us or check back soon."
            />
          ) : (
            <PaymentForm
              userId={user.id}
              plans={plans}
              programs={programs}
              initialProgramId={programs.some((p) => p.id === profile?.program_id) ? (profile?.program_id ?? null) : null}
              methods={methods}
              currency={currency}
              instructions={paymentSettings.instructions}
              initialPlanId={sp.plan ?? null}
            />
          )}
        </section>
      </div>
    </PublicShell>
  );
}
