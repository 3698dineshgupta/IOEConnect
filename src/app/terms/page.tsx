import type { Metadata } from "next";
import Link from "next/link";
import { B, LegalPage, P, UL, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using IOE Connect: accounts, content, premium access, downloads and the SCGPA calculator.",
};

const sections: LegalSection[] = [
  {
    id: "accept",
    title: "Accepting these terms",
    body: (
      <P>
        By creating an account or using IOE Connect (&ldquo;the service&rdquo;) you agree to these Terms of Service and to our{" "}
        <Link href="/privacy" className="link-underline font-medium text-primary">
          Privacy Policy
        </Link>
        . If you do not agree, please do not use the service.
      </P>
    ),
  },
  {
    id: "service",
    title: "What IOE Connect is",
    body: (
      <>
        <P>
          IOE Connect organises study material for IOE students by program, year, semester and subject: syllabus PDFs, notes, past
          questions and tools such as the SCGPA calculator. Some material is free and some needs premium.
        </P>
        <P>
          <B>We are an independent project.</B> We are not affiliated with, endorsed by or part of Tribhuvan University or the Institute
          of Engineering. Names such as &ldquo;IOE&rdquo; are used only to describe the courses the material is meant for.
        </P>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <UL>
        <li>You must give accurate information and be at least 16 years old.</li>
        <li>You are responsible for your password and for everything done through your account. Do not share it.</li>
        <li>Premium belongs to one person. Sharing an account to let others use premium is not allowed.</li>
        <li>Tell us promptly if you think someone else has used your account.</li>
      </UL>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <>
        <P>You agree not to:</P>
        <UL>
          <li>copy, scrape, mirror or bulk-download the material, or use bots or scripts to collect it;</li>
          <li>get around the view-only viewer, the premium locks, the watermark or the download stamp, or remove them from a file;</li>
          <li>share, resell or publish downloaded premium files, or post them on other websites, groups or channels;</li>
          <li>upload anything unlawful, harmful, misleading, or that you do not have the right to share;</li>
          <li>submit false payments, fake screenshots or reused transaction IDs, or abuse the referral program;</li>
          <li>try to break, overload or probe the service, or access other people&rsquo;s accounts or data.</li>
        </UL>
      </>
    ),
  },
  {
    id: "content",
    title: "Study material and ownership",
    body: (
      <>
        <P>
          The material on IOE Connect comes from students, teachers, public sources and the university&rsquo;s own syllabus and past
          papers. It remains the property of its respective authors and owners. Our design, code, branding and the way the material is
          organised belong to us.
        </P>
        <P>
          You may use the material for your own personal study. You may not use it commercially or distribute it without permission from
          its owner.
        </P>
        <P>
          <B>Copyright concerns.</B> If you believe something on IOE Connect infringes your rights, tell us through the{" "}
          <Link href="/contact" className="link-underline font-medium text-primary">
            contact form
          </Link>{" "}
          with the document title and a way to verify you are the owner. We will review it promptly and remove material where
          appropriate.
        </P>
      </>
    ),
  },
  {
    id: "uploads",
    title: "What you submit to us",
    body: (
      <UL>
        <li>
          If you upload notes or send other content, you confirm you made it or have the right to share it, and that it does not break
          anyone&rsquo;s rights or the law.
        </li>
        <li>
          You give IOE Connect a free, non-exclusive licence to host, display, copy and share your submission on the service so other
          students can use it. You keep ownership.
        </li>
        <li>Uploads are reviewed before they are published. We may edit, refuse or remove anything, at any time and without notice.</li>
      </UL>
    ),
  },
  {
    id: "premium",
    title: "Premium",
    body: (
      <>
        <UL>
          <li>
            <B>Per program.</B> Premium unlocks the premium notes and past questions, and downloading and printing, for{" "}
            <B>one program</B> (for example CSE, Civil, BEX, BEL or BME). It does not unlock your other programs. A subject that is
            shared between programs is open to members of any program that shares it. You can buy another program separately.
          </li>
          <li>
            <B>How it works.</B> Choose a program and plan, pay using the methods shown, and submit the transaction ID and a clear
            screenshot. Payments are checked by hand, usually within 24 hours, and premium starts after approval. You can have one
            payment waiting for review at a time.
          </li>
          <li>
            <B>Duration.</B> Premium lasts for the length of the plan you bought, from approval. Plans do not renew automatically.
            Buying again before it ends adds time to what you have left.
          </li>
          <li>
            <B>Refunds.</B> Because access is activated for you once your payment is approved, payments are not refundable. If we made a
            mistake (for example you were charged twice or premium was not activated), contact us within 7 days and we will put it right.
          </li>
          <li>
            <B>Rejected payments.</B> We may reject a payment that cannot be verified or looks false, and may withdraw premium that was
            obtained that way.
          </li>
          <li>
            <B>Changes.</B> Prices, plans and what is free or premium can change. A change does not affect time you have already
            bought.
          </li>
          <li>
            <B>Referrals.</B> Referral rewards are given at our discretion under the rules shown on the Referrals page. We may cancel
            rewards earned through abuse or fake accounts.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "downloads",
    title: "Viewing, downloading and printing",
    body: (
      <UL>
        <li>Free members and visitors can read documents in the viewer but cannot download or print them.</li>
        <li>
          Premium members of the right program can download and print. Your email is shown as a watermark while you read, and each
          downloaded file is stamped with your email and the date. Downloads are logged and limited.
        </li>
        <li>Downloaded files are for your own study only. You are responsible for any copy that leaves your hands.</li>
      </UL>
    ),
  },
  {
    id: "calculator",
    title: "SCGPA calculator",
    body: (
      <P>
        The calculator is a helper that follows the published IOE grading rules as we understand them. It is <B>unofficial</B>. Results
        are estimates, depend on the marks, credits and rules you and the site use, and are not an official result of Tribhuvan University
        or the Institute of Engineering. Always check important figures against your official marksheet.
      </P>
    ),
  },
  {
    id: "accuracy",
    title: "Accuracy of the material",
    body: (
      <P>
        We try to keep syllabus files, notes and past questions correct and current, but much of it is created by others and may contain
        mistakes, be out of date or be incomplete. Use it to support your studies, not instead of your syllabus, teachers or official
        notices. Exam and course rules set by your campus always come first.
      </P>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the service",
    body: (
      <P>
        We aim to keep the service running but do not promise it will always be available or error-free. We may add, change or remove
        features and material, or pause the service for maintenance, at any time.
      </P>
    ),
  },
  {
    id: "termination",
    title: "Suspension and ending your account",
    body: (
      <P>
        You can stop using IOE Connect at any time and ask us to delete your account. We may suspend or close an account, and remove
        premium, if you break these terms, abuse the service or put it or other users at risk. If we close your account for a breach, you
        will not be refunded.
      </P>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimers",
    body: (
      <P>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we give no warranties of
        any kind, including about accuracy, completeness, fitness for a particular purpose or uninterrupted access. Exam results and
        academic decisions remain your own responsibility.
      </P>
    ),
  },
  {
    id: "liability",
    title: "Limit of liability",
    body: (
      <P>
        To the extent the law allows, IOE Connect and the people who run it are not liable for indirect or consequential loss, or for any
        loss arising from your use of, or inability to use, the service or the material on it. Our total liability for any claim is limited
        to the amount you paid us for premium in the 12 months before the claim. Nothing in these terms limits liability that cannot be
        limited by law.
      </P>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <P>
        These terms are governed by the laws of Nepal. Any dispute that cannot be settled in good faith between us will be handled by the
        courts of Nepal.
      </P>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <P>
        We may update these terms from time to time. The &ldquo;last updated&rdquo; date above shows the current version. If a change is
        significant we will tell you on the site. Using the service after a change means you accept the new terms.
      </P>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="5 October 2026"
      intro={
        <P>
          These are the rules for using IOE Connect. They are written to be read: what you can do, what you cannot, how premium works,
          and what we are and are not responsible for.
        </P>
      }
      sections={sections}
      other={{ href: "/privacy", label: "Privacy Policy" }}
    />
  );
}
