"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  CreditCard,
  FolderKanban,
  Globe,
  House,
  LayoutDashboard,
  MessageCircleQuestion,
  SlidersHorizontal,
  ShieldCheck,
  Store,
  Star,
  UserCog,
  UserRoundCog,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PortalShell, type NavGroup, type TabItem } from "@/components/portal/portal-shell";
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
      { href: "/admin/kyc", label: "Identity checks", icon: ShieldCheck },
      { href: "/admin/staff", label: "Staff accounts", icon: UserCog },
      { href: "/admin/reviews", label: "Reviews", icon: Star, pending: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/website", label: "Website", icon: Globe },
      { href: "/admin/catalogue", label: "Studio & prices", icon: Store },
      { href: "/admin/content", label: "Questions & contact", icon: MessageCircleQuestion },
      { href: "/admin/business", label: "Business settings", icon: SlidersHorizontal },
      // Reached from the account menu; hidden so the header can still name it.
      { href: "/admin/settings", label: "Your account", hidden: true },
    ],
  },
  // "Your account" lives in the account menu at the foot of the sidebar,
  // not here: one place for it, and room in the sidebar for what comes next.
];

// A phone's bottom bar: the day's work. Everything else is under "More".
const TABS: TabItem[] = [
  { href: "/admin", label: "Today", icon: House },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell
        role="admin"
        groups={GROUPS}
        tabs={TABS}
        taskPaths={["/admin/bookings/new"]}
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
