import { Skeleton } from "@/components/ui";
import { BrowseContainer } from "@/components/resources/page-parts";

export default function Loading() {
  return (
    <BrowseContainer>
      <div role="status" aria-label="Loading subject">
        <Skeleton className="mb-6 h-4 w-72 max-w-full" />
        <Skeleton className="h-80 w-full rounded-[2rem]" />
        <Skeleton className="mt-16 h-8 w-48" />
        <Skeleton className="mt-6 h-36 w-full rounded-3xl" />
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    </BrowseContainer>
  );
}
