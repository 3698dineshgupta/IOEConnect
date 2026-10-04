"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mainNav, moreNav, toolsNav, type ShellUser } from "./nav-config";
import { UserMenu } from "./user-menu";
import { SearchPalette, SearchTrigger, openSearchPalette, useSearchPaletteState } from "./search-palette";

const linkBase =
  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 hover:text-foreground focus-visible:outline-offset-0";

/** Floating sticky navbar: shrinks on scroll, ⌘K search palette, Tools dropdown, mobile sheet. */
export function SiteHeader({ user, onSignOut }: { user?: ShellUser | null; onSignOut?: () => void | Promise<void> }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen, paletteQuery] = useSearchPaletteState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const resourcesActive = pathname === "/resources" || pathname.startsWith("/resources/") || pathname.startsWith("/subject/");
  const toolsActive = toolsNav.some((t) => pathname === t.href || pathname.startsWith(t.href + "/"));

  return (
    <header className={cn("sticky top-0 z-40 px-3 transition-[padding] duration-300 ease-out sm:px-4", scrolled ? "pt-2" : "pt-3")}>
      <div
        className={cn(
          "mx-auto flex max-w-310 items-center gap-2 rounded-2xl border pl-3 pr-2 backdrop-blur-xl backdrop-saturate-150 transition-[height,background-color,border-color,box-shadow] duration-300 ease-out sm:pl-4",
          scrolled
            ? "h-13 border-border bg-surface-elevated/85 shadow-[0_10px_30px_-12px_rgb(7_17_31/0.18)] dark:shadow-[0_10px_30px_-10px_rgb(0_0_0/0.7)]"
            : "h-15 border-border/70 bg-surface-elevated/60 shadow-xs",
        )}
      >
        <Logo className="mr-2 shrink-0" />

        <nav aria-label="Main" className="hidden items-center lg:flex">
          {mainNav.map((l, i) => {
            const active = i === 0 && resourcesActive;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(linkBase, active ? "text-foreground" : "text-muted-foreground")}
              >
                {l.label}
                {active && <span aria-hidden className="absolute inset-x-3 -bottom-px h-px bg-linear-to-r from-transparent via-primary to-transparent" />}
              </Link>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(linkBase, "inline-flex items-center gap-1", toolsActive ? "text-foreground" : "text-muted-foreground")}>
              Tools <ChevronDown className="size-3.5 opacity-70" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {toolsNav.map((t) => (
                <DropdownMenuItem key={t.href} href={t.href} className="items-start py-2.5">
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                    {t.description && <span className="block text-xs text-muted-foreground">{t.description}</span>}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchTrigger className="mr-1 hidden w-56 md:inline-flex xl:w-64" label="Search…" />
          <SearchTrigger variant="icon" className="md:hidden" />
          <ThemeToggle />
          {user ? (
            <div className="ml-1">
              <UserMenu user={user} onSignOut={onSignOut} />
            </div>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden h-9 sm:inline-flex")}>
                Log in
              </Link>
              <MagneticButton className="hidden sm:inline-flex">
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "h-9 px-3.5")}>
                  Sign up
                </Link>
              </MagneticButton>
            </>
          )}
          <Button variant="ghost" size="icon" className="size-9 lg:hidden" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <SearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} initialQuery={paletteQuery} />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title="Site menu" side="right" className="flex flex-col">
        <div className="mb-5">
          <Logo href={null} />
        </div>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            openSearchPalette();
          }}
          className="mb-5 flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 text-sm text-muted-foreground"
        >
          <Search className="size-4 text-primary" aria-hidden /> Search subjects, notes, PYQs…
        </button>
        <nav aria-label="Mobile" className="flex flex-col">
          {mainNav.map((l) => (
            <SheetLink key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </SheetLink>
          ))}
          <p className="mt-5 px-3 pb-1 text-xs font-semibold text-muted-foreground">Tools</p>
          {toolsNav.map((l) => (
            <SheetLink key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </SheetLink>
          ))}
          <p className="mt-5 px-3 pb-1 text-xs font-semibold text-muted-foreground">More</p>
          {moreNav.map((l) => (
            <SheetLink key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </SheetLink>
          ))}
        </nav>
        {!user && (
          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <Link href="/login" onClick={() => setMenuOpen(false)} className={buttonVariants({ variant: "outline" })}>
              Log in
            </Link>
            <Link href="/register" onClick={() => setMenuOpen(false)} className={buttonVariants()}>
              Sign up
            </Link>
          </div>
        )}
      </Sheet>
    </header>
  );
}

function SheetLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-colors hover:bg-muted">
      {children}
      <ArrowRight className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
    </Link>
  );
}
