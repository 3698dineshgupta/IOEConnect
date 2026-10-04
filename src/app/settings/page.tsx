import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { shellUser } from "@/components/resources/format";
import { Container } from "@/components/resources/page-parts";
import { ChangePasswordForm, ThemePreference } from "@/components/resources/settings-forms";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const { user, profile } = await requireUser("/settings");
  return (
    <PublicShell user={shellUser(profile) ?? { name: user.email, email: user.email }}>
      <Container className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Settings</h1>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how IOE Connect looks on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemePreference />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Pick a new password of at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delete account</CardTitle>
              <CardDescription>
                Self-service deletion is not available. To delete your account and data, contact us from the{" "}
                <Link href="/contact" className="font-medium text-primary underline">
                  contact page
                </Link>{" "}
                from the email on this account.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Container>
    </PublicShell>
  );
}
