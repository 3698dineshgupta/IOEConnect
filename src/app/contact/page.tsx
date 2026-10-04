import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Mail } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { Card } from "@/components/ui";
import { getProfile } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { ContactForm } from "@/components/community/ContactForm";
import { getShellUser } from "@/components/community/shell-user";

export const metadata: Metadata = {
  title: "Contact | IOE Connect",
  description: "Get in touch with the IOE Connect team: questions, feedback, partnerships and merchandise orders.",
};
export const dynamic = "force-dynamic";

const PRESET_SUBJECTS: Record<string, string> = {
  merch: "Merchandise order",
  premium: "Question about premium",
  feedback: "Feedback",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const [shellUser, profile, site] = await Promise.all([getShellUser(), getProfile(), getSetting("site")]);
  const raw = typeof subject === "string" ? subject.trim() : "";
  const defaultSubject = PRESET_SUBJECTS[raw.toLowerCase()] ?? raw.slice(0, 100);

  return (
    <PublicShell user={shellUser}>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contact us</h1>
          <p className="mt-2 text-muted-foreground">Questions, feedback or want to order merchandise? Send us a message and we will get back to you by email.</p>
          <Card className="mt-6 p-5 sm:p-6">
            <ContactForm
              defaultName={profile?.full_name ?? ""}
              defaultEmail={profile?.email ?? ""}
              defaultSubject={defaultSubject}
            />
          </Card>
        </div>
        <aside className="space-y-4">
          {site.contact_email && (
            <Card className="p-5">
              <Mail aria-hidden className="mb-2 size-5 text-primary" />
              <h2 className="font-semibold">Email</h2>
              <a href={`mailto:${site.contact_email}`} className="mt-1 block break-all text-sm text-primary hover:underline">
                {site.contact_email}
              </a>
            </Card>
          )}
          <Card className="p-5">
            <Bug aria-hidden className="mb-2 size-5 text-primary" />
            <h2 className="font-semibold">Found a bug?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell us what went wrong so we can fix it.</p>
            <Link href="/report-bug" className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline">
              Report a bug
            </Link>
          </Card>
        </aside>
      </div>
    </PublicShell>
  );
}
