import Link from "next/link";
import { cn } from "@/lib/utils";

/** Server-friendly tab strip driven by a `?status=` search param. */
export function StatusNav({
  basePath,
  items,
  active,
  param = "status",
  label,
}: {
  basePath: string;
  items: { value: string; label: string; count?: number }[];
  active: string;
  param?: string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="mb-5 overflow-x-auto">
      <ul className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        {items.map((it) => {
          const isActive = it.value === active;
          return (
            <li key={it.value}>
              <Link
                href={`${basePath}?${param}=${it.value}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0",
                  isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {it.label}
                {typeof it.count === "number" && (
                  <span className="rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">{it.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
