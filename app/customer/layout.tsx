"use client";

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
      { href: "/customer", label: "Overview" },
      { href: "/customer/bookings", label: "Bookings", pending: true },
      { href: "/customer/requests", label: "Requests", pending: true },
      { href: "/customer/projects", label: "Projects", pending: true },
      { href: "/customer/messages", label: "Messages", pending: true },
      { href: "/customer/payments", label: "Payments", pending: true },
      { href: "/customer/reviews", label: "Reviews", pending: true },
    ],
  },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell role="customer" groups={GROUPS}>
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
