import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calculator, Crown, GraduationCap, Send, Upload } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, buttonVariants } from "@/components/ui";
import { isPremiumActive, premiumDaysLeft } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getPrograms } from "@/lib/curriculum";
import { createAdminClient, createServerClient } from "@/lib/supabase/server";
import type { PublicResourceView } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { semesterHref, shellUser, toRoman } from "@/components/resources/format";
import { Container, ResourceRow } from "@/components/resources/page-parts";
import { Stagger, StaggerItem } from "@/components/motion";
import { PageBackdrop, PageHeader } from "@/components/community/page-header";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

async function recentlyViewed(userId: string): Promise<PublicResourceView[]> {
  try {
    // resource_views is admin-readable only under RLS, so read the signed-in user's own rows server-side.
    const { data, error } = await createAdminClient()
      .from("resource_views")
      .select("resource_id, viewed_at")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    const ids = Array.from(new Set((data ?? []).map((r: { resource_id: string }) => r.resource_id))).slice(0, 5);
    if (ids.length === 0) return [];
    const supabase = await createServerClient();
    const { data: rows, error: e2 } = await supabase.from("public_resources").select("*").in("id", ids);
    if (e2) throw e2;
    const byId = new Map((rows ?? []).map((r: PublicResourceView) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is PublicResourceView => !!r);
  } catch (err) {
    console.error("[dashboard] recentlyViewed failed", err);
    return [];
  }
}

async function listResources(order: "view_count" | "published_at"): Promise<PublicResourceView[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("public_resources")
      .select("*")
      .order(order, { ascending: false, nullsFirst: false })
      .limit(5);
    if (error) throw error;
    return (data ?? []) as PublicResourceView[];
  } catch (err) {
    console.error("[dashboard] listResources failed", err);
    return [];
  }
}

const actions = [
  { href: "/resources", label: "Browse Resources", icon: BookOpen },
  { href: "/calculator", label: "SCGPA Calculator", icon: Calculator },
  { href: "/premium", label: "Premium", icon: Crown },
  { href: "/my-uploads", label: "Upload Resource", icon: Upload },
  { href: "/my-requests", label: "Request Resource", icon: Send },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-bold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const { user, profile } = await requireUser("/dashboard");
  const [recent, popular, latest, programs] = await Promise.all([
    recentlyViewed(user.id),
    listResources("view_count"),
    listResources("published_at"),
    getPrograms(),
  ]);

  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "there";
  const program = programs.find((p) => p.id === profile?.program_id);
  const hasSemester = !!(profile?.year && profile?.semester);
  const active = isPremiumActive(profile);
  const days = premiumDaysLeft(profile);

  return (
    <PublicShell user={shellUser(profile) ?? { name, email: user.email }}>
      <Container className="relative">
        <PageBackdrop />
        <PageHeader
          className="mb-8"
          eyebrow="Dashboard"
          title={`Welcome back, ${name}`}
          description={
            hasSemester ? (
              <>
                {program ? `${program.name} · ` : ""}Year {toRoman(profile!.year!)} &middot; Semester {toRoman(profile!.semester!)}
                {program && (
                  <>
                    {" "}
                    &middot;{" "}
                    <Link href={semesterHref(program.slug, profile!.year!, profile!.semester!)} className="link-underline font-medium text-primary">
                      Open this semester
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                Your semester is not set.{" "}
                <Link href="/profile" className="link-underline font-medium text-primary">
                  Add it in your profile
                </Link>{" "}
                to jump straight to your subjects.
              </>
            )
          }
        />

        <section aria-label="Quick actions" className="mb-10">
          <h2 className="sr-only">Quick actions</h2>
          <Stagger as="ul" stagger={0.06} className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {actions.map(({ href, label, icon: Icon }) => (
              <StaggerItem as="li" key={href}>
                <Link
                  href={href}
                  className="card-lift group flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm font-semibold shadow-sm"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary ring-1 ring-primary/10 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  {label}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Section title="Recently viewed">
              {recent.length === 0 ? (
                <EmptyState
                  title="Nothing viewed yet"
                  description="Resources you open will show up here so you can pick up where you left off."
                  action={
                    <Link href="/resources" className={buttonVariants({ size: "sm" })}>
                      Browse Resources
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {recent.map((r) => (
                    <ResourceRow key={r.id} resource={r} />
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Popular resources">
              {popular.length === 0 ? (
                <EmptyState title="No resources published yet" description="Popular resources will appear once students start reading." />
              ) : (
                <ul className="space-y-2">
                  {popular.map((r) => (
                    <ResourceRow key={r.id} resource={r} meta={`${r.view_count} view${r.view_count === 1 ? "" : "s"}`} />
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Latest uploads">
              {latest.length === 0 ? (
                <EmptyState title="No uploads yet" description="New resources will be listed here as soon as they are published." />
              ) : (
                <ul className="space-y-2">
                  {latest.map((r) => (
                    <ResourceRow key={r.id} resource={r} />
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside aria-label="Premium status">
            <Card className={cn("rounded-2xl shadow-md lg:sticky lg:top-[var(--nav-offset)]", active && "border-accent/60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-4 text-accent" aria-hidden /> Premium status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {active ? (
                  <>
                    <Badge variant="success">Active</Badge>
                    <p className="text-4xl font-extrabold tracking-[-0.03em]">
                      {days} <span className="text-base font-medium text-muted-foreground">day{days === 1 ? "" : "s"} left</span>
                    </p>
                    <p className="text-sm text-muted-foreground">Expires on {formatDate(profile?.premium_expires_at)}</p>
                    <Link href="/premium" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
                      Extend Premium
                    </Link>
                  </>
                ) : (
                  <>
                    <Badge variant="neutral">{profile?.premium_expires_at ? "Expired" : "Free plan"}</Badge>
                    <p className="text-sm text-muted-foreground">
                      {profile?.premium_expires_at
                        ? `Your premium ended on ${formatDate(profile.premium_expires_at)}.`
                        : "Unlock premium notes and all past question years."}
                    </p>
                    <Link href="/premium" className={cn(buttonVariants({ variant: "accent", size: "sm" }), "w-full")}>
                      Get Premium
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <GraduationCap className="size-4" aria-hidden />
              <Link href="/profile" className="link-underline hover:text-foreground">
                Edit profile
              </Link>
            </p>
          </aside>
        </div>
      </Container>
    </PublicShell>
  );
}
