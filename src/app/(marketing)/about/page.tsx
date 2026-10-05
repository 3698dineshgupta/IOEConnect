import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Calculator, Library, Users } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { toShellUser } from "@/lib/actions/premium";
import { getProfile, getSessionUser } from "@/lib/auth";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About IOE Connect: IOE Notes & Study Resources",
  description: "IOE Connect is an independent study platform with IOE notes, syllabus and past questions organised by program, year and semester.",
  alternates: { canonical: "/about" },
};

const offers = [
  {
    icon: Library,
    title: "Resource library",
    text: "Syllabus PDFs, notes and past question papers organised by program, year, semester and subject.",
    href: "/resources",
    cta: "Browse resources",
  },
  {
    icon: Calculator,
    title: "SCGPA calculator",
    text: "Enter your Theory, Internal and Practical marks; we apply the IOE rules and work out your SGPA and CGPA.",
    href: "/calculator",
    cta: "Open the calculator",
  },
  {
    icon: BookOpenText,
    title: "Curriculum at a glance",
    text: "Browse each program's subjects with credits, marks and free or premium status, to plan your semesters.",
    href: "/resources",
    cta: "See programs",
  },
  {
    icon: Users,
    title: "Community contributions",
    text: "Share notes with other students and request material that is missing. Uploads are reviewed before publishing.",
    href: "/my-uploads",
    cta: "Contribute notes",
  },
];

const values = [
  ["Accessibility", "Good study material should be easy for every student to reach."],
  ["Community", "Students learn more when they share what they know."],
  ["Quality", "Uploads are reviewed, and files are checked before they are published."],
  ["Transparency", "We say what we are, where material comes from, and how premium works."],
];

export default async function AboutPage() {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  return (
    <PublicShell user={toShellUser(profile, user)}>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About" }])} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">About</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">About IOE Connect</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            IOE notes, syllabus and past questions for engineering students, in one organised place.
          </p>
        </header>

        <section aria-labelledby="mission-h" className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 id="mission-h" className="text-2xl font-bold tracking-[-0.02em]">
            Our mission
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            IOE Connect supports students of the Institute of Engineering (IOE), Tribhuvan University. We bring the syllabus, notes and past
            question papers of each program together by year, semester and subject, so you spend your time studying instead of searching.
          </p>
        </section>

        <section aria-labelledby="offer-h" className="mt-12">
          <h2 id="offer-h" className="text-2xl font-bold tracking-[-0.02em]">
            What you can do here
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {offers.map(({ icon: Icon, title, text, href, cta }) => (
              <li key={title} className="card-lift flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                <Link href={href} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline">
                  {cta}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="who-h" className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 id="who-h" className="text-2xl font-bold tracking-[-0.02em]">
            Who we are, and what we are not
          </h2>
          <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
            <p>
              IOE Connect is an independent project built by students who know how scattered IOE material can be. We are{" "}
              <strong className="font-semibold text-foreground">not affiliated with, or endorsed by, Tribhuvan University or the Institute of Engineering</strong>.
            </p>
            <p>
              Syllabus and past question files are the university&rsquo;s published documents. Notes come from students, teachers and public
              sources and may contain mistakes, so always check them against your official syllabus and your teachers.
            </p>
            <p>
              If you own something we have published and want it removed, or you spot an error, tell us through the{" "}
              <Link href="/contact" className="link-underline font-medium text-primary">
                contact page
              </Link>
              . Our{" "}
              <Link href="/terms" className="link-underline font-medium text-primary">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link-underline font-medium text-primary">
                Privacy Policy
              </Link>{" "}
              explain how the service works and how we handle your data.
            </p>
          </div>
        </section>

        <section aria-labelledby="values-h" className="mt-12">
          <h2 id="values-h" className="text-2xl font-bold tracking-[-0.02em]">
            What we value
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map(([title, text]) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <h2 className="text-2xl font-bold tracking-[-0.02em]">Start with your semester</h2>
          <p className="mt-2 text-muted-foreground">Find the notes, past questions and syllabus for your program.</p>
          <Link href="/resources" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Explore IOE resources
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
