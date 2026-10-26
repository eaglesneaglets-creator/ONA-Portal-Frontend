"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  MessageCircleQuestion,
  Store,
  Star,
  UserRoundCog,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { Button } from "@/components/ui/button";
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
      { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban, pending: true },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/professionals", label: "Professionals", icon: UserRoundCog },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/reviews", label: "Reviews", icon: Star, pending: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/catalogue", label: "Studio & prices", icon: Store },
      { href: "/admin/content", label: "Questions (FAQ)", icon: MessageCircleQuestion },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell
        role="admin"
        groups={GROUPS}
        actions={
          <Button asChild size="sm" className="h-11 md:h-8">
            <Link href="/admin/bookings/new">
              <CalendarPlus aria-hidden="true" />
              <span className="max-sm:sr-only">New booking</span>
            </Link>
          </Button>
        }
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
