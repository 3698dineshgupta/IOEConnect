import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Calculator, FileText } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const points = [
  { icon: FileText, text: "Notes, PYQs and syllabus for every IOE semester" },
  { icon: BookOpenCheck, text: "Read-only viewer, so every resource stays protected" },
  { icon: Calculator, text: "SGPA and CGPA calculator built for IOE grading" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="bg-gradient-navy bg-noise relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="bg-grid bg-grid-fade absolute inset-0 opacity-60 [--grid-line:rgb(255_255_255/0.06)]" />
        <div aria-hidden className="glow-blob glow-blob-drift -right-24 top-1/3 size-[420px]" />
        <div aria-hidden className="glow-blob glow-blob-cyan -bottom-24 -left-16 size-[360px]" />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <p className="eyebrow !text-cyan-bright">For IOE students</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">
            Study with everything <span className="text-gradient">in one place.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/8 ring-1 ring-white/10">
                  <Icon className="size-4 text-cyan-bright" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">IOE Connect</p>
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        <div aria-hidden className="bg-radial-glow pointer-events-none absolute inset-x-0 top-0 h-72 lg:hidden" />
        <header className="relative flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="lg:hidden"><Logo /></div>
          <Link href="/" className="link-underline hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline-flex">
            <ArrowLeft className="size-4" aria-hidden /> Back to home
          </Link>
          <ThemeToggle />
        </header>
        <main className="relative flex flex-1 items-start justify-center px-4 pb-12 pt-4 sm:items-center sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <p className="relative pb-4 text-center text-sm text-muted-foreground lg:hidden">
          <Link href="/" className="inline-flex min-h-10 items-center px-3 hover:text-foreground">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
