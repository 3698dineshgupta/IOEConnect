import { siteUrl } from "@/lib/utils";

export const SITE_NAME = "IOE Connect";

/** Cut to `max` characters at a word boundary (meta descriptions / titles). */
export function trimTo(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–]+$/, "")}…`;
}

/** Short code for a program: its short_name, else the "(CSE)" in its name, else the slug. */
export function programCode(p: { short_name?: string | null; name: string; slug: string }): string {
  const short = p.short_name?.trim();
  if (short) return short;
  const m = p.name.match(/\(([A-Za-z]{2,6})\)\s*$/);
  return m ? m[1].toUpperCase() : p.slug.toUpperCase();
}

/** The program name without a trailing "(CSE)", for running text. */
export const programPlainName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

export interface Crumb {
  name: string;
  /** Path on this site, e.g. "/resources/cse". Omit for the current page. */
  path?: string;
}

/** schema.org BreadcrumbList (the last crumb may omit `item`, per Google's guidance). */
export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: siteUrl(c.path) } : {}),
    })),
  };
}

/** Default share image (generated from the logo; served by the app/opengraph-image.png file convention). */
export const OG_IMAGES = [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "IOE Connect - IOE notes, syllabus and past questions" }];
