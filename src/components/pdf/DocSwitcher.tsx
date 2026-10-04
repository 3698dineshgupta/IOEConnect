"use client";

import * as React from "react";
import { Check, Crown, Files, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DocGroup = "SYLLABUS" | "NOTES" | "PYQ" | "OTHER";

/** One sibling document of the same subject, prepared on the server (no storage pointers). */
export interface ViewerDoc {
  id: string;
  /** Display title, with the "<Subject>: " prefix already removed. */
  title: string;
  group: DocGroup;
  pages: number | null;
  premium: boolean;
  /** Set when this PDF is one part of a split document ("<base> — Part n of m"). */
  part?: { base: string; n: number; of: number };
  /** The viewer's account can't open it (shown with a lock; the page itself explains how to unlock). */
  locked: boolean;
}

export const DOC_GROUP_ORDER: DocGroup[] = ["SYLLABUS", "NOTES", "PYQ", "OTHER"];
const GROUP_LABEL: Record<DocGroup, string> = { SYLLABUS: "Syllabus", NOTES: "Notes", PYQ: "Past questions", OTHER: "Other resources" };

/** Consecutive parts of one split document become one entry; everything else stays single. */
function bundleItems(items: ViewerDoc[]): { base: string; docs: ViewerDoc[] }[] {
  const out: { base: string; docs: ViewerDoc[] }[] = [];
  for (const d of items) {
    const last = out[out.length - 1];
    if (d.part && last && last.docs[0].part && last.docs[0].part.base.toLowerCase() === d.part.base.toLowerCase()) last.docs.push(d);
    else out.push({ base: d.part?.base ?? d.title, docs: [d] });
  }
  return out;
}

function Row({ doc, current, label, nested }: { doc: ViewerDoc; current: boolean; label?: string; nested?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: "nearest" });
  }, [current]);
  return (
    <div ref={ref}>
      <DropdownMenuItem
        href={current ? undefined : `/view/${doc.id}`}
        onSelect={current ? () => {} : undefined}
        className={cn("min-h-11 gap-3 sm:min-h-10", nested && "ml-3", current && "bg-primary-soft text-primary hover:bg-primary-soft")}
      >
        <span className="min-w-0 flex-1 truncate font-medium">
          {label ?? doc.title}
          {current && <span className="sr-only"> (currently open)</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
          {doc.pages ? <span>{doc.pages} pp</span> : null}
          {doc.locked ? <Lock aria-label="Premium: locked" /> : doc.premium ? <Crown aria-label="Premium" className="text-warning!" /> : null}
          {current && <Check aria-hidden className="text-primary!" />}
        </span>
      </DropdownMenuItem>
    </div>
  );
}

/**
 * "Documents" menu in the viewer's top bar: jump to any other PDF of the same subject without
 * going back to the subject page. Navigation is a normal client-side route change.
 */
export function DocSwitcher({ docs, currentId }: { docs: ViewerDoc[]; currentId: string }) {
  if (docs.length < 2) return null;
  const groups = DOC_GROUP_ORDER.map((g) => ({ g, items: docs.filter((d) => d.group === g) })).filter((x) => x.items.length > 0);
  const total = groups.reduce((n, x) => n + bundleItems(x.items).length, 0);
  // On phones the menu spans the top bar (its nearest positioned ancestor) instead of hanging off the button.
  return (
    <DropdownMenu className="max-sm:static">
      <DropdownMenuTrigger
        aria-label={`Switch document (${total} for this subject)`}
        title="Switch document"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:h-10"
      >
        <Files aria-hidden className="size-4.5" />
        <span className="hidden sm:inline">Documents</span>
        <span className="rounded-md bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{total}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70dvh] overflow-y-auto max-sm:left-3 max-sm:right-3 max-sm:w-auto sm:w-96">
        {groups.map(({ g, items }, i) => (
          <React.Fragment key={g}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>
              {GROUP_LABEL[g]} <span className="tabular-nums opacity-70">· {bundleItems(items).length}</span>
            </DropdownMenuLabel>
            {bundleItems(items).map((e) =>
              e.docs.length === 1 && !e.docs[0].part ? (
                <Row key={e.docs[0].id} doc={e.docs[0]} current={e.docs[0].id === currentId} />
              ) : (
                <div key={e.docs[0].id} role="group" aria-label={e.base}>
                  <p className="px-2.5 pb-0.5 pt-1.5 text-[13px] font-semibold text-foreground">
                    {e.base} <span className="text-xs font-normal text-muted-foreground">· {e.docs.length} parts</span>
                  </p>
                  {e.docs.map((d) => (
                    <Row key={d.id} doc={d} current={d.id === currentId} nested label={d.part ? `Part ${d.part.n} of ${d.part.of}` : d.title} />
                  ))}
                </div>
              ),
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
