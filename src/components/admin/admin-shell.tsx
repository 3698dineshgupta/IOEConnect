"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Bug,
  CreditCard,
  Files,
  FileUp,
  Gift,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  UploadCloud,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { createBrowserClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/resources", label: "Notes & PYQs", icon: BookOpen },
  { href: "/admin/upload", label: "Upload PDF", icon: FileUp },
  { href: "/admin/bulk-upload", label: "Bulk upload", icon: Files },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/merchandise", label: "Merchandise", icon: ShoppingBag },
  { href: "/admin/referrals", label: "Referrals", icon: Gift },
  { href: "/admin/requests", label: "Request Hub", icon: Inbox },
  { href: "/admin/student-uploads", label: "Student Uploads", icon: UploadCloud },
  { href: "/admin/messages", label: "Contact Messages", icon: Mail },
  { href: "/admin/bugs", label: "Bug Reports", icon: Bug },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export interface AdminShellUser {
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: string;
}

// Collapse state is persisted in localStorage and read through an external store (safe when storage is blocked).
const KEY = "ioe-admin-sidebar-collapsed";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
let memoryOnly: boolean | null = null;
function snapshot(): boolean {
  return memoryOnly ?? readCollapsed();
}
function writeCollapsed(v: boolean) {
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    memoryOnly = v;
  }
  listeners.forEach((l) => l());
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, collapsed, onNavigate }: { pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={cn(
              "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-accent" />}
            <Icon aria-hidden className="size-[18px] shrink-0" />
            <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function initials(u: AdminShellUser) {
  const parts = (u.name || u.email || "?").trim().split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AdminShell({ user, children }: { user: AdminShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = React.useSyncExternalStore(subscribe, snapshot, () => false);
  const [drawer, setDrawer] = React.useState(false);

  async function signOut() {
    await createBrowserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const current = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Admin";

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-0")}>
          {collapsed ? (
            <Link href="/admin" aria-label="Admin dashboard">
              <LogoMark />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Logo href="/admin" />
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                Admin
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList pathname={pathname} collapsed={collapsed} />
        </div>
        <div className="space-y-1 border-t border-border p-3">
          <Link
            href="/"
            title={collapsed ? "Back to site" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <ArrowLeft aria-hidden className="size-[18px]" />
            <span className={cn(collapsed && "sr-only")}>Back to site</span>
          </Link>
          <button
            type="button"
            onClick={() => writeCollapsed(!collapsed)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-[18px]" />
            ) : (
              <PanelLeftClose aria-hidden className="size-[18px]" />
            )}
            <span className={cn(collapsed && "sr-only")}>Collapse</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawer} onOpenChange={setDrawer} side="left" title="Admin navigation" className="p-3">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <Logo href="/admin" />
        </div>
        <NavList pathname={pathname} collapsed={false} onNavigate={() => setDrawer(false)} />
        <Link
          href="/"
          onClick={() => setDrawer(false)}
          className="mt-4 flex h-10 items-center gap-3 rounded-md border-t border-border px-3 pt-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-[18px]" /> Back to site
        </Link>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <p className="truncate text-sm font-semibold lg:hidden">{current}</p>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Admin <span aria-hidden>/</span> <span className="font-semibold text-foreground">{current}</span>
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex lg:hidden"
            >
              <ArrowLeft aria-hidden className="size-4" /> Site
            </Link>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open account menu"
                className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground"
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="size-full object-cover" />
                ) : (
                  initials(user)
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>
                  <span className="block max-w-52 truncate text-sm font-semibold text-foreground">{user.name || "Admin"}</span>
                  {user.email && <span className="block max-w-52 truncate">{user.email}</span>}
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-accent">
                    {user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem href="/">
                  <ArrowLeft aria-hidden /> Back to site
                </DropdownMenuItem>
                <DropdownMenuItem href="/profile">Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={signOut}>
                  <LogOut aria-hidden /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
