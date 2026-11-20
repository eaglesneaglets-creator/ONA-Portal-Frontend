import type { Metadata } from "next";

import { sectionTitle } from "@/lib/page-title";

import CustomerShell from "./customer-shell";

// A server file so the section can set a tab title; the sidebar shell itself
// is a client component (it reads the signed-in user), which cannot export
// metadata. Pages below set their own titles in their own layout.tsx.
export const metadata: Metadata = { title: sectionTitle("Your dashboard") };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
