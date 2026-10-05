import type { MetadataRoute } from "next";
import { getProgramTree, getPrograms } from "@/lib/curriculum";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // lastModified must reflect real changes: static pages carry the date their content last changed,
  // curriculum pages use the database's updated_at below. (Bump STATIC_UPDATED when those pages change.)
  const now = new Date("2026-10-05");
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: siteUrl("/resources"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/calculator"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: siteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/premium"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/about"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const programs = await getPrograms();
    const trees = await Promise.all(programs.map((p) => getProgramTree(p.slug)));
    for (const tree of trees) {
      if (!tree) continue;
      entries.push({ url: siteUrl(`/resources/${tree.slug}`), lastModified: tree.updated_at, changeFrequency: "weekly", priority: 0.8 });
      for (const y of tree.years) {
        entries.push({ url: siteUrl(`/resources/${tree.slug}/year-${y.number}`), lastModified: y.updated_at, changeFrequency: "weekly", priority: 0.7 });
        for (const s of y.semesters) {
          entries.push({
            url: siteUrl(`/resources/${tree.slug}/year-${y.number}/semester-${s.number}`),
            lastModified: s.updated_at,
            changeFrequency: "weekly",
            priority: 0.7,
          });
          for (const sub of s.subjects) {
            entries.push({ url: siteUrl(`/subject/${sub.slug}`), lastModified: sub.updated_at, changeFrequency: "weekly", priority: 0.8 });
          }
        }
      }
    }
  } catch (err) {
    console.error("[sitemap] curriculum unavailable", err);
  }
  return entries;
}
