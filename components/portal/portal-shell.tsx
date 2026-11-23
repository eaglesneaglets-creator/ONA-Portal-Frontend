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

import { ChevronsUpDown, LayoutGrid, LogOut, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
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
import { initials } from "@/lib/initials";

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
  /**
   * Not listed in the sidebar or the phone's More menu (it is reached another
   * way, e.g. the account menu), but still names the page in the header —
   * otherwise "/customer/settings" would fall back to its parent, "Overview".
   */
  hidden?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** A destination in the phone's bottom tab bar. Four at most; "More" is added. */
export interface TabItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
  tabs,
  taskPaths,
  children,
  actions,
}: {
  role: Role;
  groups: NavGroup[];
  /**
   * Phones only: the portal's four busiest destinations as a bottom tab bar,
   * with everything else under "More". Given tabs, a phone drops the top bar
   * (the page's own <h1> names it) and the hamburger. Without them, a phone
   * keeps the top bar and the slide-in sidebar.
   */
  tabs?: TabItem[];
  /**
   * Task screens (a form) where a phone hides the tab bar: the page pins its
   * own action bar to the bottom, and leaves by its back link.
   */
  taskPaths?: string[];
  children: React.ReactNode;
  /** Right side of the header — e.g. the primary action for this portal. */
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => isActive(pathname, i.href, all));
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden) }))
    .filter((g) => g.items.length > 0);
  const phoneTabs = tabs && tabs.length > 0;
  const onTask = !!taskPaths?.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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
          {visibleGroups.map((group) => (
            <SidebarGroup key={group.label}>
              {/* A single group whose name repeats the role label is noise;
                  only label groups when there is more than one to tell apart. */}
              {visibleGroups.length > 1 ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
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

      {/* min-w-0: a wide table must scroll inside its own container, not
          stretch the whole content column past the viewport. */}
      <SidebarInset className="min-w-0 bg-surface-alt">
        <header className={cn(
          "sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border-default bg-surface/90 px-3 backdrop-blur sm:px-4",
          // With a tab bar, a phone needs no top bar: the page's <h1> says
          // where you are, and the 56px go back to the content.
          phoneTabs && "max-md:hidden",
        )}>
          <SidebarTrigger aria-label="Open navigation" className="size-11 md:size-8" />
          <Separator orientation="vertical" className="mx-1 data-vertical:h-5 data-vertical:self-center" />
          {/* Where-am-I label, not a heading: each page owns its single <h1>. */}
          <p data-testid="shell-title" className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {current?.label ?? ROLE_LABEL[role]}
          </p>
          {actions}
        </header>
        {/* SidebarInset is the page's <main>; this is just its padding (QA F10).
            Over a tab bar, the bottom padding keeps the last row clear of it. */}
        <div className={cn(
          "flex-1 px-4 py-6 sm:px-6 lg:px-8",
          phoneTabs && "max-md:pt-5",
          phoneTabs && !onTask && "max-md:pb-[calc(6rem+env(safe-area-inset-bottom))]",
        )}>
          {children}
        </div>
      </SidebarInset>
      {phoneTabs && !onTask ? <TabBar role={role} tabs={tabs} groups={visibleGroups} current={current} /> : null}
    </SidebarProvider>
  );
}

/**
 * The phone's bottom navigation: four tabs and "More". Thumb-reach, one tap
 * to anywhere, and the app-like frame people expect on Android and iPhone.
 * Hidden from md up, where the sidebar takes over.
 */
function TabBar({
  role,
  tabs,
  groups,
  current,
}: {
  role: Role;
  tabs: TabItem[];
  groups: NavGroup[];
  current: NavItem | undefined;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const close = () => setMoreOpen(false);
  const tabHrefs = new Set(tabs.map((t) => t.href));
  const onTab = !!current && tabHrefs.has(current.href);

  // What "More" holds: every built destination that is not already a tab.
  // "Soon" items are left out on a phone — they are a roadmap, not a place.
  const more = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !tabHrefs.has(i.href) && !i.pending) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-default bg-surface/95 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
    >
      {tabs.map((tab) => (
        <TabLink
          key={tab.href}
          href={tab.href}
          label={tab.label}
          icon={tab.icon}
          active={current?.href === tab.href}
        />
      ))}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerTrigger asChild>
          <button type="button" className={tabClass(!onTab)} aria-current={!onTab ? "page" : undefined}>
            <span className={pillClass(!onTab)}><LayoutGrid aria-hidden="true" className="size-[22px]" /></span>
            More
          </button>
        </DrawerTrigger>
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader className="sr-only">
            <DrawerTitle>More</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pt-3">
            {more.map((group) => (
              <section key={group.label} className="flex flex-col gap-2">
                <h2 className="px-1 text-[13px] font-bold tracking-[0.06em] text-ink-dim uppercase">{group.label}</h2>
                {/* A grouped list, not a tile grid: any count fits without a
                    tile left alone on a row, and long labels never wrap. */}
                <ul className="overflow-hidden rounded-2xl bg-surface-alt">
                  {group.items.map((item) => (
                    <li key={item.href} className="border-b border-border-soft last:border-b-0">
                      <MoreRow item={item} active={current?.href === item.href} onNavigate={close} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <AccountRow role={role} onNavigate={close} />
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}

const tabClass = (active: boolean) => cn(
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[12px] font-bold",
  "outline-none focus-visible:ring-2 focus-visible:ring-ona-blue focus-visible:ring-inset rounded-lg",
  active ? "text-ona-blue" : "text-ink-mute",
);
const pillClass = (active: boolean) => cn(
  "grid h-[30px] w-14 place-items-center rounded-full transition-colors",
  active && "bg-info-bg",
);

function TabLink({ href, label, icon: Icon, active }: TabItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={tabClass(active)}
      aria-current={active ? "page" : undefined}
      data-tour={`nav-${href.split("/").filter(Boolean).join("-")}`}
    >
      <span className={pillClass(active)}><Icon aria-hidden="true" className="size-[22px]" /></span>
      {label}
    </Link>
  );
}

function MoreRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[52px] items-center gap-3 px-4 text-[16px] font-bold outline-none focus-visible:bg-surface-sunk",
        active ? "bg-info-bg text-ona-blue" : "text-ink",
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-5 flex-none text-ona-blue" /> : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count ? (
        <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-ona-red px-1.5 text-[12px] font-black text-white">
          {item.count}
          <span className="sr-only"> pending</span>
        </span>
      ) : null}
    </Link>
  );
}

function AccountRow({ role, onNavigate }: { role: Role; onNavigate: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const name = user?.display_name ?? "…";
  const settingsHref = role === "admin" ? "/admin/settings" : role === "customer" ? "/customer/settings" : null;
  return (
    <div className="flex items-center gap-3 border-t border-border-soft pt-3">
      <Avatar className="size-10">
        <AvatarFallback className="bg-ona-blue text-[15px] font-black text-white">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate text-[16px] font-bold text-ink">{name}</span>
        <span className="truncate text-[14px] text-ink-dim">{user?.email ?? ROLE_LABEL[role]}</span>
      </span>
      {settingsHref ? (
        <Link
          href={settingsHref}
          onClick={onNavigate}
          aria-label={role === "admin" ? "Your account" : "Settings"}
          className="grid size-11 place-items-center rounded-full bg-surface-sunk text-ink"
        >
          <Settings aria-hidden="true" className="size-5" />
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Sign out"
        className="grid size-11 place-items-center rounded-full bg-surface-sunk text-ink"
      >
        <LogOut aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  if (item.pending) {
    // Not built yet (found in the 2026-11-06 walkthrough: these were live
    // links to the 404 page). Shown so the roadmap is visible, but inert.
    return (
      <SidebarMenuItem>
        <SidebarMenuButton aria-disabled="true" tooltip={`${item.label} — coming soon`}
          className="h-11 cursor-default text-ink-mute hover:bg-transparent hover:text-ink-mute md:h-8">
          {Icon ? <Icon aria-hidden="true" /> : null}
          <span>{item.label}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="bg-surface-sunk text-[10px] font-bold uppercase tracking-wide text-ink-mute">
          Soon
        </SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }
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
          data-tour={`nav-${item.href.split("/").filter(Boolean).join("-")}`}
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
            {role === "customer" || role === "admin" ? (
              <>
                <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
                  <Link href={role === "admin" ? "/admin/settings" : "/customer/settings"}>
                    <Settings aria-hidden="true" />
                    {role === "admin" ? "Your account" : "Settings"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
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
