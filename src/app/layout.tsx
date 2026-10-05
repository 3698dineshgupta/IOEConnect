import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans-var", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono-var", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const description =
  "IOE notes, syllabus and past questions for Tribhuvan University engineering students, organised by program, year and semester. Free SCGPA calculator.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "IOE Connect",
  title: { default: "IOE Notes, Syllabus & PYQs for BE Students | IOE Connect", template: "%s | IOE Connect" },
  description,
  category: "education",
  // Every page is its own canonical (query strings dropped); pages with a different rule override this.
  alternates: { canonical: "./" },
  openGraph: { type: "website", siteName: "IOE Connect", locale: "en_US", title: "IOE Connect - IOE notes, syllabus and PYQs", description },
  twitter: { card: "summary_large_image", title: "IOE Connect - IOE notes, syllabus and PYQs", description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Search Console / Bing verification tokens come from env (they are public meta tags, not secrets).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#050b14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
