import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
