import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CreditCard, Crown, Eye, Inbox, TrendingUp, UploadCloud, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { RANGES, getDashboardData, parseRange } from "@/components/admin/dashboard-data";

export const metadata: Metadata = { title: "Dashboard" };

const nf = new Intl.NumberFormat("en-US");

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("/admin");
  const range = parseRange((await searchParams).range);
  const [data, premium] = await Promise.all([getDashboardData(range), getSetting("premium")]);
  const { stats, charts } = data;
  const period = RANGES.find((r) => r.key === range)?.label.toLowerCase() ?? "";
  const inPeriod = range === "all" ? "all time" : range === "today" ? "today" : `last ${period}`;

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="What is happening across IOE Connect."
        actions={
          <nav aria-label="Time range" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={r.key === "30" ? "/admin" : `/admin?range=${r.key}`}
                aria-current={r.key === range ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0",
                  r.key === range ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        }
      />

      {data.failed && (
        <p role="alert" className="mb-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
          Some numbers could not be loaded. Check the database connection and refresh.
        </p>
      )}

      <section aria-label="Key numbers" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={nf.format(stats.totalUsers)} hint={`+${nf.format(stats.newUsers)} ${inPeriod}`} icon={<Users />} href="/admin/users" />
        <StatCard label="Premium users" value={nf.format(stats.premiumUsers)} hint="Active right now" icon={<Crown />} tone="accent" href="/admin/users" />
        <StatCard label="Pending payments" value={nf.format(stats.pendingPayments)} hint="Waiting for review" icon={<CreditCard />} tone={stats.pendingPayments > 0 ? "danger" : "neutral"} href="/admin/payments" />
        <StatCard label="Total resources" value={nf.format(stats.totalResources)} hint="Published PDFs" icon={<BookOpen />} href="/admin/resources" />
        <StatCard label="PDF views" value={nf.format(stats.pdfViews)} hint={inPeriod} icon={<Eye />} tone="primary" />
        <StatCard label="Student uploads" value={nf.format(stats.studentUploads)} hint={`Submitted ${inPeriod}`} icon={<UploadCloud />} tone="neutral" href="/admin/student-uploads" />
        <StatCard label="Pending requests" value={nf.format(stats.pendingRequests)} hint="Open in Request Hub" icon={<Inbox />} tone={stats.pendingRequests > 0 ? "accent" : "neutral"} href="/admin/requests" />
        <StatCard label="Revenue" value={`${premium.currency} ${nf.format(Math.round(stats.revenue))}`} hint={`Approved payments, ${inPeriod}`} icon={<TrendingUp />} tone="success" href="/admin/payments" />
      </section>

      <section aria-label="Trends" className="mt-6">
        <DashboardCharts
          registrations={charts.registrations}
          premium={charts.premium}
          payments={charts.payments}
          views={charts.views}
          uploads={charts.uploads}
          currency={premium.currency}
        />
      </section>
    </>
  );
}
