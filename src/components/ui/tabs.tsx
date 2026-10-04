"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Ctx = { value: string; setValue: (v: string) => void; id: string };
const TabsCtx = React.createContext<Ctx | null>(null);
const useTabs = () => {
  const c = React.useContext(TabsCtx);
  if (!c) throw new Error("Tabs components must be inside <Tabs>");
  return c;
};

export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [inner, setInner] = React.useState(defaultValue);
  const id = React.useId();
  const current = value ?? inner;
  const setValue = (v: string) => {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
  };
  return (
    <TabsCtx.Provider value={{ value: current, setValue, id }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }
  };
  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn("no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1 ring-1 ring-inset ring-border", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ value, className, children, ...props }: { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { value: cur, setValue, id } = useTabs();
  const active = cur === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${id}-t-${value}`}
      aria-selected={active}
      aria-controls={`${id}-p-${value}`}
      tabIndex={active ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "relative isolate whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:opacity-50",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={`${id}-pill`}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg bg-card shadow-sm ring-1 ring-border dark:bg-surface-elevated"
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
        />
      )}
      {children}
    </button>
  );
}

export function TabsContent({ value, className, ...props }: { value: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { value: cur, id } = useTabs();
  if (cur !== value) return null;
  return (
    <div role="tabpanel" id={`${id}-p-${value}`} aria-labelledby={`${id}-t-${value}`} tabIndex={0} className={cn("mt-4", className)} {...props} />
  );
}
