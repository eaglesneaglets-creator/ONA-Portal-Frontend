import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/guard";
import { TITLE_TEMPLATE } from "@/lib/page-title";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Lato is brand-mandated: "Use Lato Sans Font for all our communications"
 * (ONA Visual Identity Guide, p.19).
 *
 * next/font downloads and self-hosts it at build time, so there is no
 * request to Google at runtime — no third-party connection on every page
 * load, and no layout shift while a webfont arrives.
 *
 * Four weights, matching what the design system ships: 300 for quiet meta
 * text, 400 body, 700 emphasis, 900 for display headings.
 */
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  // Turns every relative URL below (canonical links, preview images) into a
  // full one on this deployment's domain (lib/site.ts).
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: TITLE_TEMPLATE,
  },
  description:
    "Book a recording room and engineer at ONA Records in Accra. Clear prices, Mobile Money, and payment held by ONA until your session.",
  // Defaults for link previews; public pages set their own words (publicPage).
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH" },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Every page renders per request so Next can stamp this request's CSP
  // nonce on its scripts (proxy.ts). A static page has no request, so no
  // nonce, so its scripts would be blocked. API data is still cached by
  // fetch's own revalidate.
  await connection();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={cn("h-full", "antialiased", lato.variable, "font-sans")}>
      <body className="min-h-full flex flex-col">
        {/* First stop for keyboard users: jump past the header or sidebar
            (WCAG 2.4.1). Hidden until focused. Every <main> has this id;
            __tests__/page-landmarks.test.ts keeps it that way. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-ona-blue focus:px-4 focus:text-[14px] focus:font-bold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {/* Restores the session once, on boot. Public pages need this too —
            the homepage shows "Sign in" or the user's name depending on it. */}
        <TooltipProvider delayDuration={200}>
          <AuthProvider>{children}</AuthProvider>
        </TooltipProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
