import { Skeleton } from "@/components/ui";

export default function AdminReferralsLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading referrals…
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <div className="space-y-2 rounded-lg border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
