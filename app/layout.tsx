import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/guard";
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
  title: {
    default: "ONA Records",
    template: "%s — ONA Records",
  },
  description:
    "Book a studio. Hire a vetted creative professional. Every payment is held by ONA until you approve the work.",
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
    <html lang="en" className={cn("h-full", "antialiased", lato.variable, "font-sans")}>
      <body className="min-h-full flex flex-col">
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
