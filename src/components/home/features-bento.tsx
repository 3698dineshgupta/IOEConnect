import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Calculator,
  Crown,
  FileClock,
  ListChecks,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { CountUp, Spotlight, Stagger, StaggerItem, TiltCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { HomeStats } from "./data";

interface Tile {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  span: string;
  /** Real count only; omitted when 0. */
  count?: { value: number; suffix: string };
}

export function FeaturesBento({ stats }: { stats: HomeStats }) {
  const c = (value: number, suffix: string) => (value > 0 ? { value, suffix } : undefined);
  const tiles: Tile[] = [
    {
      icon: BookOpenText,
      title: "Notes, chapter by chapter",
      text: "Class and reference notes for each subject, organised by program, year and semester.",
      href: "/resources?type=NOTES",
      span: "lg:col-span-3",
      count: c(stats.byType.notes, " notes"),
    },
    {
      icon: FileClock,
      title: "PYQs: one PDF, many years",
      text: "A single file can hold many exam years. Open one document instead of ten.",
      href: "/resources?type=PYQ",
      span: "lg:col-span-3",
      count: c(stats.byType.pyq, " PYQ files"),
    },
    {
      icon: ListChecks,
      title: "Syllabus",
      text: "Official course outlines, one tap from each subject.",
      href: "/resources?type=SYLLABUS",
      span: "lg:col-span-2",
      count: c(stats.byType.syllabus, " syllabus files"),
    },
    {
      icon: Calculator,
      title: "SCGPA calculator",
      text: "Enter credits and grades to see your semester score. Save it to track progress.",
      href: "/calculator",
      span: "lg:col-span-2",
    },
    {
      icon: ShieldCheck,
      title: "Secure viewer",
      text: "Files open in a protected in-site viewer with short-lived access links.",
      span: "lg:col-span-2",
    },
    {
      icon: Crown,
      title: "Premium",
      text: "Extra resources, distraction-free reading and priority requests.",
      href: "/premium",
      span: "lg:col-span-3",
    },
    {
      icon: Upload,
      title: "Student contributions",
      text: "Upload your notes. After a quick review they are published for everyone.",
      href: "/my-uploads",
      span: "lg:col-span-3",
    },
  ];

  return (
    <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {tiles.map((t) => (
        <StaggerItem as="li" key={t.title} className={cn("min-w-0", t.span)}>
          <TiltCard className="h-full rounded-2xl" maxTilt={4} scale={1.01}>
            <Spotlight className="h-full rounded-2xl border border-border bg-card">
              <BentoBody tile={t} />
            </Spotlight>
          </TiltCard>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function BentoBody({ tile }: { tile: Tile }) {
  const { icon: Icon, title, text, href, count } = tile;
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/20">
          <Icon className="size-5" aria-hidden />
        </span>
        {href && (
          <ArrowUpRight
            className="size-5 text-muted-foreground transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        )}
      </div>
      <h3 className="mt-6 text-lg font-bold tracking-[-0.02em]">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {count && (
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
          <CountUp value={count.value} suffix={count.suffix} className="font-mono text-base font-semibold text-foreground" />
        </p>
      )}
    </>
  );
  const cls = "group relative flex h-full min-h-48 flex-col rounded-2xl p-6";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
