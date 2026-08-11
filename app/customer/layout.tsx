"use client";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors the sidebar in docs/design/pages/dashboard-customer.html.
const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/customer", label: "Overview" },
      { href: "/customer/bookings", label: "Bookings" },
      { href: "/customer/requests", label: "Requests" },
      { href: "/customer/projects", label: "Projects" },
      { href: "/customer/messages", label: "Messages" },
      { href: "/customer/payments", label: "Payments" },
      { href: "/customer/reviews", label: "Reviews" },
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
