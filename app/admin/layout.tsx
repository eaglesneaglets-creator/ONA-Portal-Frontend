"use client";

import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Star,
  UserRoundCog,
  Users,
} from "lucide-react";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors docs/design/pages/dashboard-admin.html.
const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, pending: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/approvals", label: "Approvals", icon: CheckSquare, pending: true },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, pending: true },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/professionals", label: "Professionals", icon: UserRoundCog, pending: true },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/reviews", label: "Reviews", icon: Star, pending: true },
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
