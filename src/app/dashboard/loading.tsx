import { Skeleton } from "@/components/ui";
import { Container } from "@/components/resources/page-parts";

export default function Loading() {
  return (
    <Container>
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-3 h-10 w-80 max-w-full" />
      <Skeleton className="mb-8 h-4 w-56" />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </Container>
  );
}
