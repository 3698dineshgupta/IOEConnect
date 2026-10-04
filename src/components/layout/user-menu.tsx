"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings, ShieldCheck, User as UserIcon, Upload, Gift } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ShellUser } from "./nav-config";

function initials(user: ShellUser) {
  const src = (user.name || user.email || "?").trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu({ user, onSignOut }: { user: ShellUser; onSignOut?: () => void | Promise<void> }) {
  const router = useRouter();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  async function signOut() {
    if (onSignOut) await onSignOut();
    else await createBrowserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-primary-strong to-cyan text-xs font-bold text-white ring-2 ring-surface-elevated shadow-[0_0_0_3px_var(--border),0_6px_16px_-6px_var(--glow-strong)] transition-shadow hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_45%,transparent),0_6px_16px_-6px_var(--glow-strong)]"
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
          <span className="block truncate text-sm font-semibold text-foreground">{user.name || "Student"}</span>
          {user.email && <span className="block max-w-52 truncate">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem href="/dashboard"><LayoutDashboard aria-hidden /> Dashboard</DropdownMenuItem>
        <DropdownMenuItem href="/profile"><UserIcon aria-hidden /> Profile</DropdownMenuItem>
        <DropdownMenuItem href="/my-uploads"><Upload aria-hidden /> My uploads</DropdownMenuItem>
        <DropdownMenuItem href="/referrals"><Gift aria-hidden /> Referrals</DropdownMenuItem>
        <DropdownMenuItem href="/settings"><Settings aria-hidden /> Settings</DropdownMenuItem>
        {isAdmin && <DropdownMenuItem href="/admin"><ShieldCheck aria-hidden /> Admin panel</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={signOut}><LogOut aria-hidden /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
