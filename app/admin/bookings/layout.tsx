import type { Metadata } from "next";

import { sectionTitle } from "@/lib/page-title";

// The page is a client component, which cannot export metadata; this layout
// gives it its own tab title (WCAG 2.4.2: every page titled, and uniquely).
export const metadata: Metadata = { title: sectionTitle("Bookings") };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
