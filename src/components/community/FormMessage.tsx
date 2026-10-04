import * as React from "react";
import { cn } from "@/lib/utils";

export function FormMessage({ kind, children, className }: { kind: "error" | "success"; children: React.ReactNode; className?: string }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
        className,
      )}
    >
      {children}
    </p>
  );
}
