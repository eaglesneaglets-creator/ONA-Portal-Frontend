"use client";

import {
  CalendarDays,
  CalendarPlus,
  CreditCard,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Star,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors the sidebar in docs/design/pages/dashboard-customer.html.
//
// `pending: true` marks a destination that has not been built yet, which
// stops Next prefetching a route that 404s. Remove the flag when the page
// ships — see NavItem.pending in components/portal/portal-shell.tsx.
const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/customer", label: "Overview", icon: LayoutDashboard },
      { href: "/customer/book", label: "Book a session", icon: CalendarPlus },
      { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/customer/requests", label: "Requests", icon: Inbox, pending: true },
      { href: "/customer/projects", label: "Projects", icon: FolderKanban, pending: true },
      { href: "/customer/messages", label: "Messages", icon: MessageSquare, pending: true },
      { href: "/customer/payments", label: "Payments", icon: CreditCard, pending: true },
      { href: "/customer/reviews", label: "Reviews", icon: Star, pending: true },
    ],
  },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell
        role="customer"
        groups={GROUPS}
        actions={
          <Button asChild size="sm" className="h-11 md:h-8">
            <Link href="/customer/book">
              <CalendarPlus aria-hidden="true" />
              <span className="max-sm:sr-only">Book a session</span>
            </Link>
          </Button>
        }
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
