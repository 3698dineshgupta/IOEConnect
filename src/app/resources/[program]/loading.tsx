import { Skeleton } from "@/components/ui";
import { BrowseContainer } from "@/components/resources/page-parts";

export default function Loading() {
  return (
    <BrowseContainer>
      <div role="status" aria-label="Loading">
        <Skeleton className="mb-6 h-4 w-56" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-14 w-full max-w-xl rounded-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-lg" />
        <Skeleton className="mt-12 h-56 w-full rounded-3xl" />
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </BrowseContainer>
  );
}
