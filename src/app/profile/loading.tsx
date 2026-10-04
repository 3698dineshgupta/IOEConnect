import { Skeleton } from "@/components/ui";
import { Container } from "@/components/resources/page-parts";

export default function Loading() {
  return (
    <Container className="max-w-3xl">
      <Skeleton className="mb-6 h-9 w-48" />
      <Skeleton className="mb-4 h-32" />
      <Skeleton className="h-80" />
    </Container>
  );
}
