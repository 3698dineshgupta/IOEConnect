"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Ctx = {
  open: boolean;
  setOpen: (o: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuId: string;
};
const MenuCtx = React.createContext<Ctx | null>(null);
const useMenu = () => {
  const c = React.useContext(MenuCtx);
  if (!c) throw new Error("DropdownMenu parts must be inside <DropdownMenu>");
  return c;
};

export function DropdownMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <MenuCtx.Provider value={{ open, setOpen, triggerRef, menuId }}>
      <div ref={root} className={cn("relative inline-block", className)}>
        {children}
      </div>
    </MenuCtx.Provider>
  );
}

export function DropdownMenuTrigger({
  onClick,
  onKeyDown,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef, menuId } = useMenu();
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={(e) => {
        onClick?.(e);
        setOpen(!open);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      {...props}
    />
  );
}

const ITEM = '[role="menuitem"]:not([aria-disabled="true"])';

export function DropdownMenuContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const { open, setOpen, triggerRef, menuId } = useMenu();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>(ITEM)?.focus();
  }, [open]);

  if (!open) return null;
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[n]?.focus();
    };
    if (e.key === "ArrowDown") go((i + 1) % items.length);
    else if (e.key === "ArrowUp") go((i - 1 + items.length) % items.length);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Escape") triggerRef.current?.focus();
    }
  };
  return (
    <div
      ref={ref}
      id={menuId}
      role="menu"
      onKeyDown={onKeyDown}
      className={cn(
        "absolute top-full z-40 mt-2 min-w-52 origin-top animate-pop-in rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const itemClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function DropdownMenuItem({
  className,
  onSelect,
  href,
  disabled,
  danger,
  children,
}: {
  className?: string;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const { setOpen } = useMenu();
  const cls = cn(itemClass, danger && "text-danger [&_svg]:text-danger", className);
  if (href) {
    return (
      <Link href={href} role="menuitem" className={cls} onClick={() => setOpen(false)}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      className={cls}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-3 py-2 text-xs font-medium text-muted-foreground", className)} {...props} />;
}
export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
