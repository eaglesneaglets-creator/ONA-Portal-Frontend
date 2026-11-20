"use client";

import {
  BadgeCheck,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";

import { PortalShell, type NavGroup } from "@/components/portal/portal-shell";
import { RequireAuth } from "@/lib/auth/guard";

// Mirrors docs/design/pages/pro-dashboard.html.
const GROUPS: NavGroup[] = [
  {
    label: "Work",
    items: [
      { href: "/pro", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pro/requests", label: "Open requests", icon: Inbox, pending: true },
      { href: "/pro/projects", label: "My projects", icon: FolderKanban, pending: true },
      { href: "/pro/messages", label: "Messages", icon: MessageSquare, pending: true },
    ],
  },
  {
    label: "Profile",
    items: [
      { href: "/pro/profile", label: "My profile", icon: UserRound, pending: true },
      { href: "/pro/status", label: "Approval status", icon: BadgeCheck, pending: true },
      { href: "/pro/settings", label: "Settings", icon: Settings, pending: true },
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
