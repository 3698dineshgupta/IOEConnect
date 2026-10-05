import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans-var", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono-var", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "IOE Connect - Notes, PYQs and resources for IOE", template: "%s | IOE Connect" },
  description:
    "Notes, previous year questions and study resources for IOE students, organised by program, year and semester.",
  openGraph: { title: "IOE Connect", description: "Everything you need for IOE, in one place.", type: "website", images: ["/logo.png"] },
  icons: { icon: "/logo.png" },
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
