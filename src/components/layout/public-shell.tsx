import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import type { ShellUser } from "./nav-config";

/**
 * Header + footer + mobile bottom nav over the layered page backdrop (soft radial glows on
 * --background; sections add their own grid/blobs). The header is sticky and in flow, so pages
 * need no top offset; the bottom padding clears the floating mobile tab bar.
 * Pass `user` from a server component (null when signed out).
 */
export function PublicShell({ user, children }: { user?: ShellUser | null; children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="page-backdrop">
        <div className="absolute inset-x-0 top-0 h-140 bg-grid bg-grid-fade opacity-70" />
      </div>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader user={user} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <SiteFooter />
      </div>
      <MobileBottomNav isAuthenticated={!!user} />
    </>
  );
}
