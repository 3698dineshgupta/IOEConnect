import { Skeleton } from "@/components/ui";
import { BrowseContainer } from "@/components/resources/page-parts";

export default function Loading() {
  return (
    <BrowseContainer>
      <div role="status" aria-label="Loading resources">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-14 w-full max-w-2xl rounded-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        <Skeleton className="mt-10 h-16 w-full max-w-2xl rounded-2xl" />
        <Skeleton className="mt-16 h-[26rem] w-full rounded-[2rem]" />
      </div>
    </BrowseContainer>
  );
}
