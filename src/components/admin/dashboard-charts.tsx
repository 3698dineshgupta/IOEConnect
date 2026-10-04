"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type Point = { label: string; [k: string]: number | string };

const C = { blue: "var(--primary)", orange: "var(--accent)", green: "var(--success)", navy: "var(--navy)" };

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

function hasData(data: Point[], keys: string[]) {
  return data.some((p) => keys.some((k) => Number(p[k]) > 0));
}

function ChartCard({
  title,
  description,
  data,
  keys,
  children,
}: {
  title: string;
  description: string;
  data: Point[];
  keys: string[];
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData(data, keys) ? (
          <div className="h-60 w-full" role="img" aria-label={`${title} chart`}>
            <ResponsiveContainer width="100%" height="100%">
              {children as React.ReactElement}
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3 aria-hidden />}
            title="No data in this period"
            description="Activity will show up here as it happens."
            className="py-8"
          />
        )}
      </CardContent>
    </Card>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: false,
} as const;

function AreaCard({ title, description, data, series }: { title: string; description: string; data: Point[]; series: { key: string; color: string }[] }) {
  return (
    <ChartCard title={title} description={description} data={data} keys={series.map((s) => s.key)}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${title.replace(/\W/g, "")}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} allowDecimals={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#g-${title.replace(/\W/g, "")}-${i})`}
          />
        ))}
      </AreaChart>
    </ChartCard>
  );
}

export function DashboardCharts({
  registrations,
  premium,
  payments,
  views,
  uploads,
  currency,
}: {
  registrations: Point[];
  premium: Point[];
  payments: Point[];
  views: Point[];
  uploads: Point[];
  currency: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AreaCard title="Registrations" description="New accounts per day" data={registrations} series={[{ key: "Registrations", color: C.blue }]} />
      <ChartCard title="Premium conversions" description="Users whose premium started" data={premium} keys={["Premium conversions"]}>
        <BarChart data={premium} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="Premium conversions" fill={C.orange} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
      <ChartCard title={`Payment volume (${currency})`} description="Approved payment amount per day" data={payments} keys={["Approved"]}>
        <BarChart data={payments} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} width={52} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="Approved" fill={C.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>
      <AreaCard title="Resource views" description="Deduplicated PDF views per day" data={views} series={[{ key: "Views", color: C.navy }]} />
      <div className="lg:col-span-2">
        <ChartCard title="Upload activity" description="Resources published by admins and uploads from students" data={uploads} keys={["Admin uploads", "Student uploads"]}>
          <BarChart data={uploads} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axisProps} minTickGap={24} />
            <YAxis {...axisProps} allowDecimals={false} width={44} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Admin uploads" stackId="u" fill={C.blue} />
            <Bar dataKey="Student uploads" stackId="u" fill={C.orange} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
