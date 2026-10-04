"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, Calculator, Crown, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating bottom tab bar for phones (hidden from md up). */
export function MobileBottomNav({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/resources", label: "Resources", icon: BookOpen },
    { href: "/calculator", label: "Calculator", icon: Calculator },
    { href: "/premium", label: "Premium", icon: Crown },
    { href: isAuthenticated ? "/dashboard" : "/login", label: "Account", icon: UserRound },
  ];
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href ||
        pathname.startsWith(href + "/") ||
        (href === "/resources" && pathname.startsWith("/subject/")) ||
        (href === "/dashboard" && /^\/(profile|settings|my-)/.test(pathname));

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-3 z-30 md:hidden"
      style={{ bottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 rounded-2xl border border-border bg-surface-elevated/85 p-1 shadow-[0_12px_32px_-12px_rgb(7_17_31/0.3)] backdrop-blur-xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-8px_rgb(0_0_0/0.8)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative isolate flex h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-xl bg-primary-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
