import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ReportBugDialog } from "@/components/community/ReportBugDialog";

const columns = [
  {
    title: "Study",
    links: [
      { href: "/resources", label: "Resources" },
      { href: "/resources?type=PYQ", label: "Past questions" },
      { href: "/resources?type=NOTES", label: "Notes" },
      { href: "/calculator", label: "SCGPA calculator" },
      { href: "/premium", label: "Premium" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/my-uploads", label: "Contribute notes" },
      { href: "/my-requests", label: "Request a resource" },
      { href: "/referrals", label: "Referrals" },
      { href: "/merch", label: "Merchandise" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border bg-card/60 backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      <div aria-hidden className="glow-blob -top-40 left-1/2 h-64 w-[36rem] -translate-x-1/2 opacity-60" />

      <div className="relative mx-auto grid max-w-310 px-5 pb-8 pt-12 sm:px-6 md:gap-12 md:pb-10 md:pt-14 grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Notes, previous year questions and study resources for IOE students, organised by program, year and semester.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Built by students, for students
          </p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title} className={c.title === "Company" ? "col-span-2 md:col-span-1" : undefined}>
            <h2 className="text-sm font-semibold text-foreground">{c.title}</h2>
            <ul className="mt-2 md:mt-4 md:space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-underline inline-flex min-h-10 min-w-11 items-center text-sm text-muted-foreground hover:text-foreground md:min-h-0 md:min-w-0">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* oversized outlined wordmark, cropped by the footer edge */}
      <div aria-hidden className="relative mx-auto max-w-310 select-none px-5 sm:px-6">
        <p
          className="translate-y-[18%] text-center text-[16vw] font-extrabold leading-none tracking-[-0.06em] text-transparent md:text-[11.5rem]"
          style={{
            WebkitTextStroke: "1px color-mix(in srgb, var(--primary) 22%, transparent)",
            maskImage: "linear-gradient(to bottom, #000 10%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 10%, transparent 85%)",
          }}
        >
          ioeconnect
        </p>
      </div>

      <div className="relative border-t border-border">
        <div className="mx-auto flex max-w-310 flex-col items-start gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} IOE Connect. All rights reserved.</p>
          <ReportBugDialog variant="link" className="h-auto min-h-10 p-0 text-xs md:min-h-0">
            Report a bug
          </ReportBugDialog>
        </div>
      </div>
    </footer>
  );
}
