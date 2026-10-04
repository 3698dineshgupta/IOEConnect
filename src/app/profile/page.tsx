import type { Metadata } from "next";
import Link from "next/link";
import { Crown } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { isPremiumActive, premiumDaysLeft } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { getPrograms } from "@/lib/curriculum";
import { formatDate } from "@/lib/utils";
import { shellUser } from "@/components/resources/format";
import { Container } from "@/components/resources/page-parts";
import { ProfileForm } from "@/components/resources/profile-form";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const { user, profile } = await requireUser("/profile");
  const programs = await getPrograms();
  const active = isPremiumActive(profile);
  const days = premiumDaysLeft(profile);

  return (
    <PublicShell user={shellUser(profile) ?? { name: user.email, email: user.email }}>
      <Container className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Your profile</h1>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? user.email ?? ""} readOnly aria-describedby="email-note" className="bg-muted" />
                <p id="email-note" className="text-xs text-muted-foreground">
                  Your email is your login and cannot be changed here.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Premium</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">{profile?.premium_expires_at ? "Expired" : "Free plan"}</Badge>}
                    {profile?.premium_expires_at && (
                      <span className="text-sm text-muted-foreground">
                        {active ? `Expires ${formatDate(profile.premium_expires_at)} (${days} day${days === 1 ? "" : "s"} left)` : `Ended ${formatDate(profile.premium_expires_at)}`}
                      </span>
                    )}
                  </div>
                  {!active && (
                    <Link href="/premium" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                      <Crown className="size-4" aria-hidden /> Get Premium
                    </Link>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Referral code</p>
                  <p className="mt-1.5 font-mono text-lg font-semibold tracking-wider">{profile?.referral_code ?? "—"}</p>
                  <Link href="/referrals" className="text-sm text-primary hover:underline">
                    Share and track referrals
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                programs={programs.map((p) => ({ id: p.id, name: p.name }))}
                defaults={{
                  full_name: profile?.full_name ?? "",
                  college: profile?.college ?? "",
                  program_id: profile?.program_id ?? "",
                  year: profile?.year ? String(profile.year) : "",
                  semester: profile?.semester ? String(profile.semester) : "",
                }}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                Profile pictures are not available yet, so your initials are shown instead.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PublicShell>
  );
}
