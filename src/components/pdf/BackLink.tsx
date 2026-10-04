"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** A subject whose pages can legitimately show this document (itself + same-course twins in other programs). */
export interface BackTarget {
  slug: string;
  name: string;
}

export const LAST_SUBJECT_KEY = "ioe:last-subject";

/**
 * Viewer back button. A shared note lives on one subject but is shown on its twins too, so on a plain
 * click "back" returns to the subject page the student was actually browsing (remembered per tab by
 * the subject page) when that subject is one of `targets`; otherwise to the document's own subject.
 * The link's href stays the document's own subject (right-click / open-in-new-tab behave normally).
 */
export function BackLink({
  href,
  label,
  targets,
  className,
  children,
}: {
  href: string;
  label: string;
  targets?: BackTarget[];
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={className}
      onClick={(e) => {
        if (!targets?.length || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        try {
          const last = window.sessionStorage.getItem(LAST_SUBJECT_KEY);
          const target = last ? targets.find((t) => t.slug === last) : undefined;
          if (target) {
            e.preventDefault();
            router.push(`/subject/${target.slug}`);
          }
        } catch {
          /* storage unavailable: normal navigation */
        }
      }}
    >
      {children}
    </Link>
  );
}
