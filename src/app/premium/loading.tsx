import { Skeleton } from "@/components/ui";

export default function PremiumLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14" aria-busy="true">
      <span className="sr-only" role="status">
        Loading premium plans…
      </span>
      <div className="mb-12 flex flex-col items-center gap-3">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}
