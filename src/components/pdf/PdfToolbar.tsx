"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  LayoutGrid,
  Maximize,
  Minimize,
  Minus,
  MoveHorizontal,
  Plus,
  Printer,
  RectangleVertical,
  RotateCw,
  Search,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZOOM_PRESETS, zoomPercent } from "./zoom";

export type ZoomMode = "fit-width" | "fit-page" | "custom";

const btn =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground/85 transition-colors duration-150 hover:bg-foreground/7 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 md:size-10 [&_svg]:size-4.5";
const activeBtn = "bg-primary/12 text-primary hover:bg-primary/15 hover:text-primary";

function ToolButton({
  label,
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(btn, active && activeBtn, className)}
      {...props}
    >
      {children}
    </button>
  );
}

const Divider = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("mx-0.5 h-5 w-px shrink-0 bg-foreground/10", className)} />
);

/** Menu that opens upward from the floating pill. Closes on outside press and Escape. */
function PillMenu({
  label,
  trigger,
  triggerClassName,
  disabled,
  children,
  align = "center",
}: {
  label: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
  children: (close: () => void) => React.ReactNode;
  align?: "center" | "end";
}) {
  const [state, setState] = React.useState({ open: false, refocus: false });
  const open = state.open;
  const setOpen = React.useCallback((o: boolean, refocus = false) => setState({ open: o, refocus }), []);
  const close = React.useCallback(() => setOpen(false, true), [setOpen]);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false, true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    rootRef.current?.querySelector<HTMLElement>("[role^=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, setOpen]);
  // Return focus to the trigger after choosing an item or pressing Escape.
  React.useEffect(() => {
    if (!state.open && state.refocus) triggerRef.current?.focus();
  }, [state]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };
  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(btn, "w-auto gap-1 px-2.5", open && "bg-foreground/7", triggerClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            "pdfv-glass absolute bottom-full z-50 mb-3 max-h-[min(70dvh,26rem)] min-w-48 origin-bottom animate-pop-in overflow-y-auto rounded-2xl p-1.5",
            align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  checked,
  onSelect,
  children,
  hint,
}: {
  checked?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={onSelect}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-foreground/6 focus-visible:bg-foreground/8 [&_svg]:size-4 [&_svg]:shrink-0"
    >
      <span className="flex size-4 items-center justify-center text-primary">{checked && <Check aria-hidden />}</span>
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>}
    </button>
  );
}
const MenuSep = () => <div role="separator" className="mx-2 my-1 h-px bg-foreground/10" />;

export interface PdfToolbarProps {
  disabled: boolean;
  page: number;
  numPages: number;
  onGoTo: (page: number) => void;
  zoom: number;
  zoomMode: ZoomMode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (zoom: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onRotate: () => void;
  years: [string, [number, number]][];
  currentYear: string | null;
  onYear: (year: string) => void;
  thumbsOpen: boolean;
  onToggleThumbs: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Premium members and admins can download/print; everyone else sees a locked button. */
  canDownload: boolean;
  busy: "download" | "print" | null;
  onDownload: () => void;
  onPrint: () => void;
}

export function PdfToolbar(p: PdfToolbarProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(String(p.page));
  const [editing, setEditing] = React.useState(false);
  const shown = editing ? draft : String(p.page);
  const pct = zoomPercent(p.zoom);

  const commit = () => {
    setEditing(false);
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) p.onGoTo(Math.min(Math.max(1, n), Math.max(1, p.numPages)));
  };

  const zoomMenu = (close: () => void) => (
    <>
      <div className="flex items-center justify-between gap-1 px-1 pb-1">
        <ToolButton label="Zoom out" onClick={p.onZoomOut} className="size-10">
          <Minus />
        </ToolButton>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        <ToolButton label="Zoom in" onClick={p.onZoomIn} className="size-10">
          <Plus />
        </ToolButton>
      </div>
      <MenuSep />
      <MenuItem checked={p.zoomMode === "fit-width"} hint="0" onSelect={() => (p.onFitWidth(), close())}>
        Fit width
      </MenuItem>
      <MenuItem checked={p.zoomMode === "fit-page"} onSelect={() => (p.onFitPage(), close())}>
        Fit page
      </MenuItem>
      <MenuSep />
      {ZOOM_PRESETS.map((z) => (
        <MenuItem
          key={z}
          checked={p.zoomMode === "custom" && Math.abs(p.zoom - z) < 0.005}
          onSelect={() => (p.onZoomTo(z), close())}
        >
          {Math.round(z * 100)}%
        </MenuItem>
      ))}
    </>
  );

  const yearItems = (close: () => void) =>
    p.years.map(([year, [start, end]]) => (
      <MenuItem key={year} checked={p.currentYear === year} hint={`p. ${start}–${end}`} onSelect={() => (p.onYear(year), close())}>
        {year}
      </MenuItem>
    ));

  return (
    <div
      role="toolbar"
      aria-label="Document controls"
      className="pdfv-glass flex max-w-[calc(100vw-1rem)] items-center rounded-full p-1 sm:gap-0.5"
    >
      <ToolButton
        label={p.thumbsOpen ? "Hide page thumbnails" : "Show page thumbnails"}
        active={p.thumbsOpen}
        disabled={p.disabled}
        onClick={p.onToggleThumbs}
        className="hidden sm:inline-flex"
      >
        <LayoutGrid />
      </ToolButton>
      <Divider className="hidden sm:block" />

      <ToolButton label="Previous page" disabled={p.disabled || p.page <= 1} onClick={() => p.onGoTo(p.page - 1)}>
        <ChevronLeft />
      </ToolButton>
      <label className="flex h-11 shrink-0 items-center gap-1 px-0.5 text-sm tabular-nums md:h-10">
        <span className="sr-only">Page number</span>
        <input
          inputMode="numeric"
          enterKeyHint="go"
          disabled={p.disabled}
          value={shown}
          onFocus={(e) => {
            setDraft(String(p.page));
            setEditing(true);
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 5))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditing(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          style={{ width: `${Math.max(2, String(p.numPages || 0).length) + 1.6}ch` }}
          className="h-8 rounded-lg bg-foreground/6 px-1 text-center font-semibold text-foreground outline-none ring-primary/60 transition-shadow focus:bg-background focus:ring-2"
        />
        <span className="whitespace-nowrap text-muted-foreground">/ {p.numPages || "–"}</span>
      </label>
      <ToolButton label="Next page" disabled={p.disabled || p.page >= p.numPages} onClick={() => p.onGoTo(p.page + 1)}>
        <ChevronRight />
      </ToolButton>

      <Divider />
      <ToolButton label="Zoom out" disabled={p.disabled} onClick={p.onZoomOut} className="hidden md:inline-flex">
        <Minus />
      </ToolButton>
      <PillMenu
        label={`Zoom ${pct}%, choose zoom level`}
        disabled={p.disabled}
        trigger={
          <>
            <span className="min-w-[3.25ch] text-right text-[13px] font-semibold tabular-nums">{pct}%</span>
            <ChevronDown className="size-3.5! opacity-60" aria-hidden />
          </>
        }
      >
        {zoomMenu}
      </PillMenu>
      <ToolButton label="Zoom in" disabled={p.disabled} onClick={p.onZoomIn} className="hidden md:inline-flex">
        <Plus />
      </ToolButton>
      <ToolButton
        label="Fit width"
        active={p.zoomMode === "fit-width"}
        disabled={p.disabled}
        onClick={p.onFitWidth}
        className="hidden md:inline-flex"
      >
        <MoveHorizontal />
      </ToolButton>
      <ToolButton
        label="Fit page"
        active={p.zoomMode === "fit-page"}
        disabled={p.disabled}
        onClick={p.onFitPage}
        className="hidden md:inline-flex"
      >
        <RectangleVertical />
      </ToolButton>

      <Divider className="hidden md:block" />
      <ToolButton label="Rotate clockwise" disabled={p.disabled} onClick={p.onRotate} className="hidden md:inline-flex">
        <RotateCw />
      </ToolButton>
      {p.years.length > 0 && (
        <div className="hidden md:flex">
          <PillMenu
            label="Jump to exam year"
            disabled={p.disabled}
            trigger={
              <>
                <CalendarRange aria-hidden />
                <span className="text-[13px] font-semibold tabular-nums">{p.currentYear ?? "Year"}</span>
                <ChevronDown className="size-3.5! opacity-60" aria-hidden />
              </>
            }
          >
            {yearItems}
          </PillMenu>
        </div>
      )}
      <ToolButton label="Search in document" active={p.searchOpen} disabled={p.disabled} onClick={p.onToggleSearch}>
        <Search />
      </ToolButton>
      {p.canDownload ? (
        <>
          <ToolButton label="Download PDF" disabled={p.disabled || p.busy !== null} onClick={p.onDownload} className="hidden md:inline-flex">
            <Download className={cn(p.busy === "download" && "animate-pulse")} />
          </ToolButton>
          <ToolButton label="Print" disabled={p.disabled || p.busy !== null} onClick={p.onPrint} className="hidden md:inline-flex">
            <Printer className={cn(p.busy === "print" && "animate-pulse")} />
          </ToolButton>
        </>
      ) : (
        <a
          href="/premium"
          title="Download and print are Premium features"
          aria-label="Download and print are Premium features. Get Premium."
          className={cn(btn, "hidden w-auto gap-1.5 px-3 text-[13px] font-semibold md:inline-flex")}
        >
          <Lock aria-hidden className="size-3.5!" /> Premium
        </a>
      )}
      <ToolButton
        label={p.fullscreen ? "Exit full screen" : "Full screen"}
        onClick={p.onToggleFullscreen}
        className="hidden md:inline-flex"
      >
        {p.fullscreen ? <Minimize /> : <Maximize />}
      </ToolButton>

      {/* Phones: the rest lives in a menu so every target stays 44px. */}
      <div className="flex md:hidden">
        <PillMenu label="More controls" align="end" disabled={p.disabled} trigger={<Ellipsis aria-hidden />} triggerClassName="w-11 px-0">
          {(close) => (
            <>
              <MenuItem onSelect={() => (p.onToggleThumbs(), close())}>Page thumbnails</MenuItem>
              <MenuItem onSelect={() => (p.onRotate(), close())}>Rotate clockwise</MenuItem>
              {p.canDownload ? (
                <>
                  <MenuItem onSelect={() => (p.onDownload(), close())}>Download PDF</MenuItem>
                  <MenuItem onSelect={() => (p.onPrint(), close())}>Print</MenuItem>
                </>
              ) : (
                <MenuItem onSelect={() => (router.push("/premium"), close())}>Download and print (Premium)</MenuItem>
              )}
              <MenuItem onSelect={() => (p.onToggleFullscreen(), close())}>{p.fullscreen ? "Exit full screen" : "Full screen"}</MenuItem>
              {p.years.length > 0 && (
                <>
                  <MenuSep />
                  <p className="px-3 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Jump to exam year</p>
                  {yearItems(close)}
                </>
              )}
            </>
          )}
        </PillMenu>
      </div>
    </div>
  );
}
