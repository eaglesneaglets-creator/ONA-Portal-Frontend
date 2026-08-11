"use client";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors docs/design/pages/dashboard-admin.html.
const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/approvals", label: "Approvals" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/projects", label: "Projects" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/professionals", label: "Professionals" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/reviews", label: "Reviews" },
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
