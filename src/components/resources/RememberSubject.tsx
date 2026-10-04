"use client";

import * as React from "react";
import { LAST_SUBJECT_KEY } from "@/components/pdf/BackLink";

/** Remembers (per tab) which subject page the student is on, so the viewer's back button can return to it. */
export function RememberSubject({ slug }: { slug: string }) {
  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(LAST_SUBJECT_KEY, slug);
    } catch {
      /* storage unavailable: back falls back to the document's own subject */
    }
  }, [slug]);
  return null;
}
