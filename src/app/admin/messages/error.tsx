"use client";

import { PageError } from "@/components/community/PageError";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
