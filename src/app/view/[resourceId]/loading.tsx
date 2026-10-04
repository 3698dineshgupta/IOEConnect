import { PageSkeleton, ViewerStyles } from "@/components/pdf/viewer-chrome";

/** Route-level skeleton in the same shape as the viewer: slim bar, stage, sheets, toolbar pill. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background" aria-busy="true" aria-label="Opening document">
      <ViewerStyles />
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-elevated/85 px-3">
        <div className="size-9 rounded-xl bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-2/3 max-w-sm rounded-full bg-muted" />
          <div className="h-2.5 w-1/3 max-w-48 rounded-full bg-muted" />
        </div>
      </div>
      <div className="pdfv-stage relative min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-col items-center gap-6 px-2 pt-3 sm:px-10 sm:pt-7">
          <PageSkeleton className="aspect-[1/1.414] w-full max-w-260" />
        </div>
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <div className="pdfv-glass h-12 w-72 rounded-full" />
        </div>
      </div>
    </div>
  );
}
