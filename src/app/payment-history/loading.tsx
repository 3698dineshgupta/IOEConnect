import { Skeleton } from "@/components/ui";

export default function PaymentHistoryLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading payment history…
      </span>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="hidden h-10 w-36 sm:block" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
