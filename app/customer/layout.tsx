import type { Metadata, Viewport } from "next";

import { sectionTitle } from "@/lib/page-title";
import { PRIVATE_PAGE } from "@/lib/site";

import CustomerShell from "./customer-shell";

// A server file so the section can set a tab title; the sidebar shell itself
// is a client component (it reads the signed-in user), which cannot export
// metadata. Pages below set their own titles in their own layout.tsx.
export const metadata: Metadata = { ...PRIVATE_PAGE, title: sectionTitle("Your dashboard") };

// viewport-fit=cover lets the phone tab bar sit flush on the bottom edge and
// pad itself clear of the iPhone home indicator (env(safe-area-inset-bottom)).
// Set here, not in the root layout, so the public site is untouched.
export const viewport: Viewport = { viewportFit: "cover" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
