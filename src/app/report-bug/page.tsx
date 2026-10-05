import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import { Card } from "@/components/ui";
import { BugReportForm } from "@/components/community/BugReportForm";
import { getShellUser } from "@/components/community/shell-user";

export const metadata: Metadata = {
  title: "Report a bug",
  description: "Found something broken on IOE Connect? Tell us what happened so we can fix it quickly.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

export default async function ReportBugPage() {
  const shellUser = await getShellUser();
  return (
    <PublicShell user={shellUser}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Report a bug</h1>
        <p className="mt-2 text-muted-foreground">
          Describe what went wrong. We capture your browser and device automatically to help us reproduce it.
        </p>
        <Card className="mt-6 p-5 sm:p-6">
          <BugReportForm idPrefix="bugpg" />
        </Card>
      </div>
    </PublicShell>
  );
}
