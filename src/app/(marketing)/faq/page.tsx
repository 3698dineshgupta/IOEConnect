import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { toShellUser } from "@/lib/actions/premium";
import { getProfile, getSessionUser } from "@/lib/auth";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "IOE Notes FAQ: Syllabus, PYQs, Premium & SGPA",
  description: "Answers about IOE Connect: free IOE notes, syllabus and past questions, premium access per program, downloads and the SCGPA calculator.",
  alternates: { canonical: "/faq" },
};

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is IOE Connect?",
    answer:
      "IOE Connect is a study platform for students of the Institute of Engineering (IOE), Tribhuvan University. It organises syllabus PDFs, notes and past year questions by program, year, semester and subject, and includes an SCGPA calculator.",
  },
  {
    question: "Is IOE Connect free to use?",
    answer:
      "A large part of the library is free to read with an account, including the first two syllabi of every semester. Premium is optional and unlocks the remaining premium notes and past questions, and downloading and printing, for one program.",
  },
  {
    question: "Which IOE programs and semesters are covered?",
    answer:
      "Computer, Civil, Electronics and Communication, Electrical and Mechanical engineering, organised by year and semester. Coverage differs by subject, so open the Resources page to see what is available today, or send a resource request for anything missing.",
  },
  {
    question: "Are these notes official?",
    answer:
      "No. IOE Connect is an independent project and is not part of Tribhuvan University or the Institute of Engineering. Notes come from students, teachers and public sources; syllabus and past question files are the university's published documents. Always follow your campus and the official syllabus where they differ.",
  },
  {
    question: "How do I use the SCGPA calculator?",
    answer:
      "Pick a semester and type your Theory, Internal and Practical marks for each subject. The calculator applies the IOE rules (the 20% internal cap and the 40% pass mark in each part), gives each subject a grade, and works out your SGPA and cumulative CGPA. Log in to save your marks.",
  },
  {
    question: "What grading scale does the calculator use?",
    answer:
      "The 2080/81 IOE scale: 80%+ A (4.0), 75-79% A- (3.7), 70-74% B+ (3.3), 65-69% B (3.0), 60-64% B- (2.7), 55-59% C+ (2.3), 50-54% C (2.0), 40-49% D (1.0) and below 40% F (0).",
  },
  {
    question: "How accurate is the GPA calculation?",
    answer:
      "SGPA = Σ(grade point × credits) ÷ Σ credits, shown to two decimals. The calculator is unofficial, so always check important figures against your official marksheet.",
  },
  {
    question: "Can I download the PDFs?",
    answer:
      "Everyone can read documents online in the secure viewer. Premium members can also download and print the documents of their program; each copy is stamped with the member's email and the date.",
  },
  {
    question: "How does Premium work?",
    answer:
      "Premium is bought per program. Choose your program and a plan, pay with the listed method and upload your payment proof. An admin checks it, usually within 24 hours, and activates Premium for that program. Subjects shared between programs are open to members of any program that shares them.",
  },
  {
    question: "Can I save my calculator results?",
    answer: "Yes. When you are logged in you can save your marks and open them again from any device.",
  },
  {
    question: "How can I request a missing resource?",
    answer:
      "Use the My Requests page to ask for a subject's notes or past questions. Administrators review requests and add material as it becomes available.",
  },
  {
    question: "Can I upload my own notes?",
    answer:
      "Yes. Upload your notes from your account. Every upload is reviewed before it is published, and you must have the right to share what you upload.",
  },
  {
    question: "Is my information secure?",
    answer:
      "We use encrypted connections, hashed passwords, private file storage and access controls, and we do not sell your information. The Privacy Policy explains exactly what we collect and who helps us run the site.",
  },
  {
    question: "What is the referral program?",
    answer:
      "Invite a friend with your referral code. When they buy premium you can earn the reward shown on the Referrals page. Rewards are given under the rules there and may be cancelled if the program is abused.",
  },
  {
    question: "How do I contact the team?",
    answer: "Use the Contact page. We reply by email.",
  },
];

export default async function FAQPage() {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  return (
    <PublicShell user={toShellUser(profile, user)}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
            },
            breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "FAQ" }]),
          ],
        }}
      />
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <header>
          <p className="text-sm font-semibold text-primary">Help</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">IOE Connect FAQ</h1>
          <p className="mt-3 text-muted-foreground">
            Quick answers about IOE notes, syllabus, past questions, premium access and the SCGPA calculator.
          </p>
        </header>

        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-2xl border border-border bg-card shadow-xs open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-[0.9375rem] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <h2 className="min-w-0 text-[0.9375rem] font-semibold leading-snug">{faq.question}</h2>
                <span aria-hidden className="text-lg text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="text-xl font-bold tracking-[-0.015em]">Still have questions?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Read the{" "}
            <Link href="/privacy" className="link-underline font-medium text-primary">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="link-underline font-medium text-primary">
              Terms of Service
            </Link>
            , or send us a message.
          </p>
          <Link href="/contact" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Contact us
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
