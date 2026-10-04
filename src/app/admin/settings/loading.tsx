import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <Skeleton className="mb-6 h-9 w-40" />
      <Skeleton className="mb-4 h-10 w-full max-w-xl" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
