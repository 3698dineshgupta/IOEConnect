import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading uploader">
      <Skeleton className="mb-6 h-9 w-48" />
      <Skeleton className="mx-auto h-80 max-w-3xl rounded-lg" />
    </div>
  );
}
