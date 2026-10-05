import { PublicShell } from "@/components/layout/public-shell";
import type { ShellUser } from "@/components/layout/nav-config";
import { Accordion } from "@/components/ui/accordion";
import { Reveal } from "@/components/motion";
import { createServerClient } from "@/lib/supabase/server";
import { Hero } from "@/components/home/hero";
import { SearchSection } from "@/components/home/search-section";
import { ProgramShowcase } from "@/components/home/program-showcase";
import { AcademicTimeline } from "@/components/home/academic-timeline";
import { FeaturesBento } from "@/components/home/features-bento";
import { CoverageWidget, PyqSection } from "@/components/home/pyq-journey";
import { ContributeCta, FinalCta, PremiumTeaser, ScgpaTeaser } from "@/components/home/cta-sections";
import { SectionHead } from "@/components/home/section-head";
import { getHomeStats } from "@/components/home/data";
import { ProgramsGrid } from "@/components/home/programs-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/utils";

/** Auth only. Any failure (no env, no tables) simply renders the signed-out page. */
async function loadUser(): Promise<ShellUser | null> {
  try {
    const supabase = await createServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar, role")
      .eq("id", auth.user.id)
      .maybeSingle();
    return {
      name: profile?.full_name ?? (auth.user.user_metadata?.full_name as string | undefined) ?? null,
      email: auth.user.email,
      avatar: profile?.avatar ?? null,
      role: profile?.role ?? "USER",
    };
  } catch {
    return null;
  }
}

const faqs = [
  { value: "free", title: "Is IOE Connect free?", content: "Yes. A large part of the library is free to read with an account, including the first two syllabi of every semester. Premium is optional and unlocks the rest of the premium notes and past questions for one program." },
  { value: "coverage", title: "Which IOE programs and semesters are covered?", content: "Computer, Civil, Electronics and Communication, Electrical and Mechanical engineering, organised by year and semester. Open Resources to see what is available today. Missing something? Send a request." },
  { value: "download", title: "Can I download the PDFs?", content: "Everyone can read files online in the secure viewer. Premium members can also download and print the PDFs of their program; every copy is stamped with the member's email." },
  { value: "premium", title: "How do I get Premium?", content: "Choose your program and a plan on the Premium page, pay using the listed method and upload your payment proof. An admin checks it, usually within 24 hours, and activates Premium for that program." },
  { value: "share", title: "Can I share my own notes?", content: "Yes. Upload notes from your account. After review they are published for other students under your contribution." },
];

const section = "mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24";

export default async function Home() {
  const [user, stats] = await Promise.all([loadUser(), getHomeStats()]);

  return (
    <PublicShell user={user}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": siteUrl("/#organization"),
              name: "IOE Connect",
              url: siteUrl("/"),
              logo: siteUrl("/icon.png"),
              description: "Notes, syllabus and past questions for Tribhuvan University Institute of Engineering (IOE) students.",
            },
            {
              "@type": "WebSite",
              "@id": siteUrl("/#website"),
              url: siteUrl("/"),
              name: "IOE Connect",
              inLanguage: "en",
              publisher: { "@id": siteUrl("/#organization") },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: siteUrl("/resources?q={search_term_string}") },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.content } })),
            },
          ],
        }}
      />
      <Hero subjects={stats.subjects} />

      <section aria-labelledby="search-h" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <Reveal>
          <h2 id="search-h" className="mb-7 text-center text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            Find any subject in seconds.
          </h2>
          <SearchSection />
        </Reveal>
      </section>

      <section aria-labelledby="programs-h" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <Reveal>
          <SectionHead
            eyebrow="IOE notes by program"
            title={<span id="programs-h">Pick your engineering program.</span>}
            text="Syllabus, notes and past questions for every IOE program, semester by semester."
          />
        </Reveal>
        <div className="mt-10">
          <ProgramsGrid />
        </div>
      </section>

      <section aria-label="Computer Engineering program" className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6">
        <Reveal>
          <ProgramShowcase />
        </Reveal>
      </section>

      <section className={section}>
        <Reveal>
          <SectionHead
            eyebrow="Academic journey"
            title="Four years. Eight semesters."
            text="Jump straight into the semester you are studying."
          />
        </Reveal>
        <div className="mt-12">
          <AcademicTimeline program="cse" />
        </div>
      </section>

      <section className={section}>
        <Reveal>
          <SectionHead
            eyebrow="Everything in one place"
            title="Built around how you study."
            text="Less hunting for files, more time on the subject."
          />
        </Reveal>
        <div className="mt-12">
          <FeaturesBento stats={stats} />
        </div>
      </section>

      <section className={section}>
        <PyqSection />
        <CoverageWidget stats={stats} />
      </section>

      <section className={section}>
        <ScgpaTeaser />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <PremiumTeaser />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <ContributeCta />
      </section>

      <section aria-labelledby="faq-h" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <SectionHead eyebrow="FAQ" title={<span id="faq-h">Questions, answered.</span>} align="center" />
        </Reveal>
        <Reveal delay={0.1} className="mt-10 rounded-2xl border border-border bg-card px-5 shadow-md sm:px-7">
          <Accordion items={faqs} headingLevel={3} />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 sm:pb-28">
        <FinalCta signedIn={!!user} />
      </section>
    </PublicShell>
  );
}
