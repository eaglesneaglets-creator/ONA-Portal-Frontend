/**
 * The shell every portal shares — UI v2 (docs/design/ui-v2.md).
 *
 * The industry-standard dashboard frame (Linear, Vercel, shadcn dashboard-01):
 * a collapsible sidebar (icon rail on desktop, a sheet on phones) beside a
 * slim header carrying the page title and the user menu. One component with a
 * nav table per role — not three copies.
 *
 * Built on shadcn's Sidebar, coloured entirely by the ONA tokens it is mapped
 * to in globals.css. Tap targets stay at the 44px floor on phones (ADR-013);
 * the denser 32px rows only apply where there is a mouse.
 */

"use client";

import { ChevronsUpDown, LogOut, ShieldCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Role } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Unread or pending count, shown as a badge. */
  count?: number;
  /**
   * The destination has not been built yet.
   *
   * Next prefetches the RSC payload for every <Link> in the viewport, so a
   * link to a route that does not exist fires a background 404 on every page
   * load. The link stays visible — the sidebar describes the shape of the
   * portal — only the speculative fetch is suppressed.
   *
   * Delete this flag from an item when its page ships.
   */
  pending?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_LABEL: Record<Role, string> = {
  customer: "Workspace",
  professional: "Professional",
  admin: "Admin console",
};

function isActive(pathname: string, href: string, all: NavItem[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // A parent ("/admin") is active on its children only when no more specific
  // nav item claims the path ("/admin/bookings").
  return !all.some((i) => i.href !== href && i.href.startsWith(href) &&
    (pathname === i.href || pathname.startsWith(`${i.href}/`)));
}

export function PortalShell({
  role,
  groups,
  children,
  actions,
}: {
  role: Role;
  groups: NavGroup[];
  children: React.ReactNode;
  /** Right side of the header — e.g. the primary action for this portal. */
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => isActive(pathname, i.href, all));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" aria-label={ROLE_LABEL[role]}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="ONA Records home">
                <Link href="/">
                  <Image src="/ona-icon.png" alt="" width={32} height={32} className="rounded-md" />
                  <span className="grid leading-tight">
                    <span className="text-[15px] font-black tracking-tight text-ink">ONA Records</span>
                    <span className="text-xs text-ink-mute">{ROLE_LABEL[role]}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              {/* A single group whose name repeats the role label is noise;
                  only label groups when there is more than one to tell apart. */}
              {groups.length > 1 ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} active={current?.href === item.href} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          {/* The customer is the one whose money is held, so the reassurance
              sits in their sidebar specifically. Hidden on the icon rail. */}
          {role === "customer" ? (
            <div className="flex gap-2.5 rounded-lg bg-surface-alt p-3 text-xs leading-snug text-ink-dim group-data-[collapsible=icon]:hidden">
              <ShieldCheck aria-hidden="true" className="mt-px size-4 flex-none text-ona-blue" />
              <span>
                <b className="block font-bold text-ink">Protected by ONA</b>
                Payments and identities stay on-platform.
              </span>
            </div>
          ) : null}
          <UserMenu role={role} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-surface-alt">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border-default bg-surface/90 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger aria-label="Open navigation" className="size-11 md:size-8" />
          <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
          {/* Where-am-I label, not a heading: each page owns its single <h1>. */}
          <p data-testid="shell-title" className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {current?.label ?? ROLE_LABEL[role]}
          </p>
          {actions}
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="h-11 md:h-8 data-active:text-ona-red"
      >
        <Link
          href={item.href}
          prefetch={item.pending ? false : undefined}
          aria-current={active ? "page" : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          {Icon ? <Icon aria-hidden="true" /> : null}
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {item.count ? (
        <SidebarMenuBadge className="bg-ona-red text-white">
          {item.count}
          <span className="sr-only"> pending</span>
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "·";
}

function UserMenu({ role }: { role: Role }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const name = user?.display_name ?? "…";
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label={`Account menu for ${name}`}>
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-ona-blue text-xs font-bold text-white">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-bold text-ink">{name}</span>
                <span className="truncate text-xs text-ink-mute">{user?.email ?? ROLE_LABEL[role]}</span>
              </span>
              <ChevronsUpDown aria-hidden="true" className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-bold text-ink">{name}</span>
              <span className="block text-xs text-ink-mute">{ROLE_LABEL[role]}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()} className="min-h-11 md:min-h-8">
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
