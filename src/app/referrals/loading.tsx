import { Skeleton } from "@/components/ui";

export default function ReferralsLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading referrals…
      </span>
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <Skeleton className="mb-6 h-56 w-full" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
