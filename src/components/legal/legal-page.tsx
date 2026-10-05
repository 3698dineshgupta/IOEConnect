import type { ReactNode } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { toShellUser } from "@/lib/actions/premium";
import { getProfile, getSessionUser } from "@/lib/auth";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed text-muted-foreground marker:text-primary/60">{children}</ul>;
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

/** Shared layout for the Privacy Policy and the Terms of Service. */
export async function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  other,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  return (
    <PublicShell user={toShellUser(profile, user)}>
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="mt-5 space-y-3">{intro}</div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav aria-label="On this page" className="lg:sticky lg:top-[calc(var(--nav-offset)+0.5rem)] lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
            <ol className="space-y-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 rounded-md py-0.5 text-muted-foreground hover:text-foreground">
                    <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-muted-foreground/70">{i + 1}.</span>
                    <span className="min-w-0">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-[calc(var(--nav-offset)+1rem)]">
                <h2 id={`${s.id}-h`} className="flex gap-3 text-xl font-bold tracking-[-0.015em]">
                  <span className="font-mono text-base font-medium tabular-nums text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">{s.title}</span>
                </h2>
                <div className="mt-3 space-y-3">{s.body}</div>
              </section>
            ))}

            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Questions about this page? Use our{" "}
              <Link href="/contact" className="link-underline font-medium text-primary">
                contact form
              </Link>
              . You may also want to read our{" "}
              <Link href={other.href} className="link-underline font-medium text-primary">
                {other.label}
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
