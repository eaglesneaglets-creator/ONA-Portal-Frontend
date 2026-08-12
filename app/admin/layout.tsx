"use client";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors docs/design/pages/dashboard-admin.html.
const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics", pending: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/approvals", label: "Approvals", pending: true },
      { href: "/admin/bookings", label: "Bookings", pending: true },
      { href: "/admin/payments", label: "Payments", pending: true },
      { href: "/admin/projects", label: "Projects", pending: true },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/professionals", label: "Professionals", pending: true },
      { href: "/admin/customers", label: "Customers", pending: true },
      { href: "/admin/reviews", label: "Reviews", pending: true },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell role="admin" groups={GROUPS}>
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
