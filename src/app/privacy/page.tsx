import type { Metadata } from "next";
import Link from "next/link";
import { B, LegalPage, P, UL, type LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What IOE Connect collects, why, who we share it with, and the choices you have.",
};

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <P>
          IOE Connect (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a study platform for students of the Institute of Engineering (IOE),
          Tribhuvan University, Nepal. It offers notes, past questions, syllabus PDFs, an SCGPA calculator and premium access. We are an
          independent student project and are not part of Tribhuvan University or the Institute of Engineering.
        </P>
        <P>This policy explains what personal information we handle when you use the website, and what we do with it.</P>
      </>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <P>
          <B>Information you give us</B>
        </P>
        <UL>
          <li>
            <B>Account:</B> your name, email address and password. Your password is handled by our sign-in provider and stored only in
            hashed form; we cannot read it.
          </li>
          <li>
            <B>Profile (optional):</B> college, program, year, semester and a profile picture, plus your referral code and who referred
            you.
          </li>
          <li>
            <B>Premium payments:</B> the program and plan you choose, the payment method, the transaction ID you type in, and the payment
            screenshot you upload.
          </li>
          <li>
            <B>SCGPA calculator:</B> the marks you choose to save to your account. Marks you only type in stay on your own device.
          </li>
          <li>
            <B>Things you send us:</B> contact messages, bug reports, resource requests and files you upload to share with other
            students.
          </li>
        </UL>
        <P>
          <B>Information collected automatically</B>
        </P>
        <UL>
          <li>
            <B>Activity:</B> which resources you open (used for &ldquo;recently viewed&rdquo; and view counts) and what you search for
            (used to improve search).
          </li>
          <li>
            <B>Technical data:</B> IP address, browser and device type and request logs, kept by our hosting provider for security and
            reliability.
          </li>
          <li>
            <B>Document protection data:</B> when you open or download a PDF we record which document, when, and which account did it
            (see section 6).
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use your information",
    body: (
      <UL>
        <li>To create and secure your account, sign you in and keep you signed in.</li>
        <li>To show the right resources and remember where you left off.</li>
        <li>To verify premium payments by hand, activate premium for the program you bought, and keep payment records.</li>
        <li>To run the referral program and prevent abuse of it.</li>
        <li>To review and publish student uploads, answer your messages and fix bugs.</li>
        <li>To protect study material from copying and to keep the service safe (rate limits, abuse prevention).</li>
        <li>To understand which content is useful so we can improve the site.</li>
      </UL>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <P>
          <B>We do not sell your personal information</B> and we do not run third-party advertising. We share data only with the
          services that help us run IOE Connect, and only what each needs:
        </P>
        <UL>
          <li>
            <B>Supabase</B> &mdash; database, sign-in and private file storage (your account, profile, saved marks, payment records and
            payment screenshots).
          </li>
          <li>
            <B>Vercel</B> &mdash; hosts the website and sees request data such as IP addresses.
          </li>
          <li>
            <B>Telegram</B> &mdash; our study PDFs are stored in a private Telegram chat. When you submit a premium payment, your
            name, email, program, plan, amount, transaction ID and screenshot are also sent to our private admin chat on Telegram so
            an administrator can verify it.
          </li>
          <li>
            <B>iLovePDF</B> &mdash; used by administrators to compress large PDF files. It receives study documents, not your personal
            data.
          </li>
        </UL>
        <P>
          Our administrators can see account and payment details as needed to do their work. We may disclose information if the law
          requires it, to protect our users or the service, or to enforce our{" "}
          <Link href="/terms" className="link-underline font-medium text-primary">
            Terms of Service
          </Link>
          . If the project is ever transferred to someone else, your data would move with it under this policy.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <P>
          We use a small number of cookies that are strictly needed: they keep you signed in and protect your session. We do not use
          advertising or cross-site tracking cookies.
        </P>
        <P>
          Your browser&rsquo;s local storage is used for conveniences on your own device: your theme, the last subject you browsed (for
          the back button), and your unsaved SCGPA calculator marks. Clearing your browser data removes them.
        </P>
      </>
    ),
  },
  {
    id: "documents",
    title: "Payment screenshots and document protection",
    body: (
      <>
        <UL>
          <li>
            Payment screenshots are stored in a private bucket. Only you and administrators can open them, through short-lived links.
          </li>
          <li>
            Study PDFs are shown in a protected viewer. Your <B>email address is shown as a watermark</B> over the pages you read.
          </li>
          <li>
            Premium members can download or print PDFs. Each downloaded copy is <B>stamped with your email and the date</B>, and
            downloads are rate-limited and logged, so leaked copies can be traced to an account.
          </li>
        </UL>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <UL>
        <li>Account and profile data: for as long as your account exists.</li>
        <li>
          Payment records and screenshots: kept after approval or rejection so we can handle disputes and keep accounts, even if your
          account is later closed.
        </li>
        <li>Saved SCGPA marks, activity and search data: until you delete them or your account is removed.</li>
        <li>Messages, bug reports and requests: until they are resolved, and for a reasonable time afterwards.</li>
        <li>Server logs: for the short period our hosting provider retains them.</li>
      </UL>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    body: (
      <>
        <P>You can:</P>
        <UL>
          <li>View and edit your profile and saved marks in your account.</li>
          <li>Clear locally stored data by clearing your browser storage.</li>
          <li>Ask us for a copy of the personal information we hold about you, ask us to correct it, or ask us to delete your account.</li>
          <li>Object to, or ask us to limit, a particular use of your information.</li>
        </UL>
        <P>
          Send requests through our{" "}
          <Link href="/contact" className="link-underline font-medium text-primary">
            contact form
          </Link>{" "}
          from the email address on your account. We may need to keep some information where the law or a genuine dispute requires it
          (for example payment records). Nepali law, including the Privacy Act, 2075 (2018), gives you rights over your personal
          information; we aim to respect them.
        </P>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <P>
        We use access controls on our database, private storage, encrypted connections (HTTPS), hashed passwords and short-lived
        links. No online service can promise perfect security, so please use a strong, unique password and tell us straight away if you
        think your account has been accessed by someone else.
      </P>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <P>
        IOE Connect is made for university students and is not meant for children under 16. If you believe a child has given us personal
        information, contact us and we will delete it.
      </P>
    ),
  },
  {
    id: "transfers",
    title: "Where data is processed",
    body: (
      <P>
        Our service providers run servers in several countries, so your information may be processed outside Nepal. By using IOE Connect
        you understand this, and we choose providers that protect data with appropriate safeguards.
      </P>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <P>
        We may update this policy as the service changes. The &ldquo;last updated&rdquo; date above shows the current version. If a
        change is significant we will tell you on the site. Continuing to use IOE Connect after a change means you accept it.
      </P>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="5 October 2026"
      intro={
        <P>
          Your privacy matters. This page says, in plain language, what IOE Connect collects when you study, sign in, calculate your
          SCGPA or buy premium, why we need it, and what you can do about it.
        </P>
      }
      sections={sections}
      other={{ href: "/terms", label: "Terms of Service" }}
    />
  );
}
