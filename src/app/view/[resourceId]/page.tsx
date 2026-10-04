import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Clock, Crown, FileText, LogIn } from "lucide-react";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { canAccessResource, canDownloadPdf } from "@/lib/access";
import { DocSwitcher, type DocGroup, type ViewerDoc } from "@/components/pdf/DocSwitcher";
import { getSharedSubjects, getSubjectResources } from "@/lib/curriculum";
import { splitPartTitle } from "@/components/resources/format";
import { ViewerFrame, ViewerStateCard, type ViewerMeta } from "@/components/pdf/viewer-chrome";
import { buttonVariants } from "@/components/ui";
import { getProfile, getSessionUser } from "@/lib/auth";
import { scopeProfileToSubject } from "@/lib/program-premium";
import { decideAccess, loadStoredResource, toViewerResource, UUID_RE } from "@/lib/pdf-access";
import { createServerClient } from "@/lib/supabase/server";
import { RESOURCE_TYPE_LABELS } from "@/lib/types";

type Params = { params: Promise<{ resourceId: string }> };

const getResource = cache(async (id: string) => (UUID_RE.test(id) ? loadStoredResource(id) : null));

const getSubject = cache(async (subjectId: string) => {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.from("subjects").select("slug, name").eq("id", subjectId).maybeSingle();
    return (data as { slug: string; name: string } | null) ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { resourceId } = await params;
  let title = "Viewer";
  try {
    const r = await getResource(resourceId);
    if (r && r.status === "PUBLISHED") title = r.title;
  } catch {
    /* fall back to generic title */
  }
  return { title: `${title} | IOE Connect`, robots: { index: false, follow: false } };
}

/*
 * The viewer is a full-viewport reading surface: no site navbar, footer or mobile tab bar.
 * A slim top bar (back, title, subject, badges) replaces them; the stage scrolls internally.
 */
export default async function ViewResourcePage({ params }: Params) {
  const { resourceId } = await params;
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);

  let resource: Awaited<ReturnType<typeof getResource>>;
  try {
    resource = await getResource(resourceId);
  } catch {
    return (
      <ViewerFrame meta={null}>
        <ViewerStateCard
          tone="danger"
          icon={<FileText />}
          title="This resource didn’t load"
          description="Something went wrong on our side. Try again in a moment."
          action={
            <Link href="/resources" className={buttonVariants({ variant: "outline" })}>
              Browse resources
            </Link>
          }
        />
      </ViewerFrame>
    );
  }
  if (!resource) notFound();

  const decision = await decideAccess(user, profile, resource);
  if (!decision.ok && decision.code === "NOT_FOUND") notFound();

  const subject = await getSubject(resource.subject_id);
  const scoped = await scopeProfileToSubject(profile, resource.subject_id);
  const viewPath = `/view/${resourceId}`;

  // Other documents of this subject for the switcher (public columns only; locked = this account can't open it).
  const prefix = subject ? `${subject.name}: ` : "";
  const groupOf = (t: string): DocGroup => (t === "SYLLABUS" || t === "NOTES" || t === "PYQ" ? t : "OTHER");
  const siblings: ViewerDoc[] = (await getSubjectResources(resource.subject_id))
    .map((r) => {
      const title = r.title.startsWith(prefix) ? r.title.slice(prefix.length) || r.title : r.title;
      const p = splitPartTitle(title);
      return {
      id: r.id,
      title,
      part: p ? { base: p.base, n: p.part, of: p.of } : undefined,
      group: groupOf(r.resource_type),
      pages: r.page_count ?? null,
      premium: r.access_type === "PREMIUM",
      locked: !canAccessResource(scoped, { access_type: r.access_type, status: r.status }),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }));
  const switcher = <DocSwitcher docs={siblings} currentId={resourceId} />;
  const meta: ViewerMeta = {
    title: resource.title,
    backHref: subject ? `/subject/${subject.slug}` : "/resources",
    backLabel: subject ? `Back to ${subject.name}` : "Back to resources",
    backTargets: await getSharedSubjects(resource.subject_id),
    subjectName: subject?.name ?? null,
    typeLabel: RESOURCE_TYPE_LABELS[resource.resource_type],
    access: resource.access_type === "PREMIUM" ? "PREMIUM" : "FREE",
    pageCount: resource.page_count ?? null,
  };

  if (!decision.ok) {
    const isLogin = decision.code === "LOGIN_REQUIRED";
    return (
      <ViewerFrame meta={meta} actions={switcher}>
        {isLogin ? (
          <ViewerStateCard
            icon={<LogIn />}
            title="Sign in to read this document"
            description={
              resource.access_type === "PREMIUM"
                ? "Sign in with a Premium account to read this document."
                : "Create a free account or sign in to read this document."
            }
            action={
              <>
                <Link href={`/login?next=${encodeURIComponent(viewPath)}`} className={buttonVariants({ variant: "primary" })}>
                  Sign in
                </Link>
                <Link href={`/register?next=${encodeURIComponent(viewPath)}`} className={buttonVariants({ variant: "outline" })}>
                  Create account
                </Link>
              </>
            }
          />
        ) : (
          <ViewerStateCard
            tone="accent"
            icon={<Crown />}
            title="This is a Premium resource"
            description="Upgrade to IOE Connect Premium for this program to unlock its premium notes and past questions, and to download or print."
            action={
              <Link href="/premium" className={buttonVariants({ variant: "accent", size: "lg" })}>
                <Crown /> Get Premium
              </Link>
            }
          />
        )}
      </ViewerFrame>
    );
  }

  if (!resource.fileId) {
    return (
      <ViewerFrame meta={meta} actions={switcher}>
        <ViewerStateCard
          tone="neutral"
          icon={<Clock />}
          title="This file is still being prepared"
          description="It will be ready to read in a few minutes. Check back shortly."
          action={
            <Link href={meta.backHref} className={buttonVariants({ variant: "outline" })}>
              {meta.backLabel}
            </Link>
          }
        />
      </ViewerFrame>
    );
  }

  const viewer = toViewerResource(resource);
  const watermarkText = profile?.email ?? user?.email ?? "Guest viewer";

  return (
    <PdfViewer
      key={viewer.id}
      resourceId={viewer.id}
      title={viewer.title}
      yearPageRanges={viewer.year_page_ranges}
      watermarkText={watermarkText}
      meta={meta}
      canDownload={canDownloadPdf(scoped)}
      siblings={siblings}
    />
  );
}
