import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Simple prev/next pagination driven by URL search params. */
export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < pageCount ? hrefFor(page + 1) : null;
  const disabled = "pointer-events-none opacity-50";
  return (
    <nav aria-label={label} className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {pageCount} · {total} total
      </p>
      <div className="flex gap-2">
        {prev ? (
          <Link href={prev} className={buttonVariants({ variant: "outline", size: "sm" })} rel="prev">
            <ChevronLeft aria-hidden /> Previous
          </Link>
        ) : (
          <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "sm" }), disabled)}>
            <ChevronLeft aria-hidden /> Previous
          </span>
        )}
        {next ? (
          <Link href={next} className={buttonVariants({ variant: "outline", size: "sm" })} rel="next">
            Next <ChevronRight aria-hidden />
          </Link>
        ) : (
          <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "sm" }), disabled)}>
            Next <ChevronRight aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

/** URL-driven filter tabs (server-rendered links). */
export function FilterTabs<T extends string>({
  tabs,
  current,
  hrefFor,
  label,
}: {
  tabs: { value: T; label: string; count?: number | null }[];
  current: T;
  hrefFor: (value: T) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {tabs.map((t) => {
        const active = t.value === current;
        return (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-primary-soft text-primary" : "bg-background text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
