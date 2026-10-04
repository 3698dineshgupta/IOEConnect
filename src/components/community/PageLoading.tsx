import { Skeleton } from "@/components/ui";

export function PageLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}
