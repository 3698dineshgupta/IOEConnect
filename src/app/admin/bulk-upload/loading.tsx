import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading bulk uploader">
      <Skeleton className="mb-6 h-9 w-56" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
