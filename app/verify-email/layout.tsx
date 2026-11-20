import type { Metadata } from "next";

import { PRIVATE_PAGE } from "@/lib/site";

// The page is a client component, which cannot export metadata; this layout
// gives it its own tab title (WCAG 2.4.2: every page titled, and uniquely).
export const metadata: Metadata = { ...PRIVATE_PAGE, title: "Confirm your email" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
