"use client";

import { CalendarDays, LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { type Role, homeFor } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";
import { initials } from "@/lib/initials";

/** Where a signed-in person goes from the public site, by role. */
function linksFor(role: Role) {
  if (role === "admin") {
    return {
      primary: { href: "/admin", label: "Open console" },
      home: { href: "/admin", label: "Console" },
      bookings: { href: "/admin/bookings", label: "Bookings" },
      settings: { href: "/admin/settings", label: "Your account" },
    };
  }
  if (role === "customer") {
    return {
      primary: { href: "/customer/book", label: "Book a session" },
      home: { href: "/customer", label: "Dashboard" },
      bookings: { href: "/customer/bookings", label: "My bookings" },
      settings: { href: "/customer/settings", label: "Settings" },
    };
  }
  const home = homeFor(role);
  return { primary: { href: home, label: "Open dashboard" }, home: { href: home, label: "Dashboard" }, bookings: null, settings: null };
}

/**
 * Who is looking at the public site. Public pages have no auth guard, so the
 * session is restored here (initialise() is safe to call more than once).
 */
function usePublicSession() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const initialise = useAuthStore((s) => s.initialise);
  useEffect(() => {
    void initialise();
  }, [initialise]);
  const signedIn = status === "authenticated" && user !== null;
  return { status, user, links: signedIn && user ? linksFor(user.role) : null };
}

/** Desktop header actions: Sign in + Book for visitors; an account menu once signed in. */
export function HeaderAccount({ bookHref }: { bookHref: string }) {
  const { status, user, links } = usePublicSession();
  const logout = useAuthStore((s) => s.logout);

  if (status === "loading") {
    // Same footprint as the signed-out buttons, so nothing jumps when it resolves.
    return <Skeleton aria-hidden="true" className="h-10 w-36 rounded-lg sm:w-52" />;
  }
  if (!user || !links) {
    return (
      <>
        <Button asChild variant="ghost" className="hidden h-10 px-3 text-[14px] font-bold text-ink-dim sm:inline-flex">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild className="h-11 px-4 text-[14px] font-bold md:h-10">
          <Link href={bookHref}>Book a session</Link>
        </Button>
      </>
    );
  }

  const name = user.display_name || user.email;
  return (
    <>
      <Button asChild className="h-11 px-4 text-[14px] font-bold md:h-10">
        <Link href={links.primary.href}>{links.primary.label}</Link>
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="hidden size-11 rounded-full p-0 md:inline-flex md:size-10"
            aria-label={`Account menu for ${name}`}>
            <Avatar className="size-9">
              <AvatarFallback className="bg-ona-blue text-[12.5px] font-bold text-white">{initials(name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-bold text-ink">{name}</span>
            <span className="block truncate text-xs text-ink-mute">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
              <Link href={links.home.href}><LayoutDashboard aria-hidden="true" />{links.home.label}</Link>
            </DropdownMenuItem>
            {links.bookings ? (
              <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
                <Link href={links.bookings.href}><CalendarDays aria-hidden="true" />{links.bookings.label}</Link>
              </DropdownMenuItem>
            ) : null}
            {links.settings ? (
              <DropdownMenuItem asChild className="min-h-11 md:min-h-8">
                <Link href={links.settings.href}><Settings aria-hidden="true" />{links.settings.label}</Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()} className="min-h-11 md:min-h-8">
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const SHEET_LINK =
  "flex min-h-[var(--tap-min)] items-center gap-2.5 rounded-md px-3 text-[15px] font-bold text-ink hover:bg-surface-sunk";

/** The phone menu's account part: Sign in for visitors; who you are and where to go once signed in. */
export function SheetAccount({ onNavigate }: { onNavigate: () => void }) {
  const { user, links } = usePublicSession();
  const logout = useAuthStore((s) => s.logout);
  if (!user || !links) {
    return (
      <Link href="/login" onClick={onNavigate} className={SHEET_LINK}>
        Sign in
      </Link>
    );
  }
  const name = user.display_name || user.email;
  return (
    <div className="mt-2 border-t border-border-soft pt-3">
      <div className="mb-1 flex items-center gap-3 px-3 py-2">
        <Avatar className="size-9">
          <AvatarFallback className="bg-ona-blue text-[12.5px] font-bold text-white">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-ink">{name}</span>
          <span className="block truncate text-[12.5px] text-ink-mute">{user.email}</span>
        </span>
      </div>
      <Link href={links.home.href} onClick={onNavigate} className={SHEET_LINK}>
        <LayoutDashboard aria-hidden="true" className="size-4" />{links.home.label}
      </Link>
      {links.bookings ? (
        <Link href={links.bookings.href} onClick={onNavigate} className={SHEET_LINK}>
          <CalendarDays aria-hidden="true" className="size-4" />{links.bookings.label}
        </Link>
      ) : null}
      {links.settings ? (
        <Link href={links.settings.href} onClick={onNavigate} className={SHEET_LINK}>
          <Settings aria-hidden="true" className="size-4" />{links.settings.label}
        </Link>
      ) : null}
      <button type="button" onClick={() => { onNavigate(); void logout(); }} className={`${SHEET_LINK} w-full text-left`}>
        <LogOut aria-hidden="true" className="size-4" />Sign out
      </button>
    </div>
  );
}

/** The phone menu's call to action: Book for visitors and customers; the console for staff. */
export function SheetPrimary({ bookHref, onNavigate }: { bookHref: string; onNavigate: () => void }) {
  const { links } = usePublicSession();
  const target = links?.primary ?? { href: bookHref, label: "Book a session" };
  return (
    <Button asChild className="h-11 w-full font-bold">
      <Link href={target.href} onClick={onNavigate}>{target.label}</Link>
    </Button>
  );
}
