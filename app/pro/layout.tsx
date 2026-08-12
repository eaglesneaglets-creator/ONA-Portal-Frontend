"use client";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors docs/design/pages/pro-dashboard.html.
const GROUPS: NavGroup[] = [
  {
    label: "Work",
    items: [
      { href: "/pro", label: "Dashboard" },
      { href: "/pro/requests", label: "Open requests", pending: true },
      { href: "/pro/projects", label: "My projects", pending: true },
      { href: "/pro/messages", label: "Messages", pending: true },
    ],
  },
  {
    label: "Profile",
    items: [
      { href: "/pro/profile", label: "My profile", pending: true },
      { href: "/pro/status", label: "Approval status", pending: true },
      { href: "/pro/settings", label: "Settings", pending: true },
    ],
  },
];

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <PortalShell role="professional" groups={GROUPS}>
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
