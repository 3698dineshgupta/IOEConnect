"use client";

import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export function PageError({ reset, title = "Something went wrong" }: { reset: () => void; title?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={<AlertTriangle aria-hidden />}
        title={title}
        description="We could not load this page. Please try again in a moment."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
