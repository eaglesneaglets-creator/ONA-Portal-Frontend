/**
 * The shell all three portals share.
 *
 * Ports the sidebar + topbar from the approved designs. One component with a
 * nav table per role, not three copies — the design system already proved
 * that point: `.card` was defined four separate times across the HTML
 * prototypes before it was extracted.
 *
 * Content is intentionally empty at this stage. Task 14 is the auth slice;
 * the portals only have to prove that the right person lands in the right
 * shell.
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { Role } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";

export interface NavItem {
  href: string;
  label: string;
  /** Unread or pending count, shown as a pill. */
  count?: number;
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

export function PortalShell({
  role,
  groups,
  children,
}: {
  role: Role;
  groups: NavGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavId = `mobile-${role}-navigation`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-ink/45 lg:hidden"
          />
          <nav
            id={mobileNavId}
            aria-label={`${ROLE_LABEL[role]} mobile`}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(84vw,320px)] flex-col overflow-y-auto bg-ona-gradient p-3 text-white shadow-pop lg:hidden"
          >
            <div className="mb-3 flex items-center gap-2">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex min-h-[var(--tap-min)] flex-1 items-center gap-2.5 rounded-pill bg-white px-3"
              >
                <Image src="/ona-icon.png" alt="" width={32} height={32} />
                <span className="font-black tracking-tight text-ink">ONA Records</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-md text-2xl text-white hover:bg-white/10"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <p className="px-3 pb-2 text-[10.5px] font-bold tracking-[0.16em] text-white/65">
              {ROLE_LABEL[role].toUpperCase()}
            </p>
            {groups.map((group) => (
              <div key={group.label} className="mb-2">
                {groups.length > 1 && (
                  <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/55">
                    {group.label}
                  </p>
                )}
                <ul>
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex min-h-[var(--tap-min)] items-center rounded-md px-3 text-[13.5px] ${
                            active
                              ? "bg-white font-bold text-ink"
                              : "text-white/85 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </>
      )}

      {/* The sidebar is hidden below 1024px in the approved design; a
          mobile nav is a later task, not part of the auth slice. */}
      <nav
        aria-label={ROLE_LABEL[role]}
        className="bg-ona-gradient hidden flex-col p-3 text-white lg:flex"
      >
        <Link
          href="/"
          className="mb-2 flex items-center gap-2.5 rounded-pill bg-white px-3 py-2.5"
        >
          <Image src="/ona-icon.png" alt="" width={34} height={34} />
          <span>
            <span className="block text-[15px] font-black leading-none tracking-tight text-ink">
              ONA
            </span>
            <span className="mt-0.5 block text-[8px] tracking-[0.16em] text-ink-mute">
              RECORDS
            </span>
          </span>
        </Link>

        <p className="px-3 pb-3.5 text-[10.5px] font-bold tracking-[0.16em] text-white/65">
          {ROLE_LABEL[role].toUpperCase()}
        </p>

        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* A single group whose name repeats the role label is noise —
                the customer portal read "WORKSPACE" twice in a row. Only
                label groups when there is more than one to tell apart. */}
            {groups.length > 1 && (
              <p className="px-3 pb-1.5 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/55">
                {group.label}
              </p>
            )}
            <ul>
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[var(--tap-min)] items-center gap-2.5 rounded-md px-3 text-[13.5px] transition-colors ${
                        active
                          ? "bg-white font-bold text-ink"
                          : "text-white/85 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.label}
                      {item.count ? (
                        <span className="ml-auto rounded-pill bg-ona-red px-2 py-0.5 text-[10.5px] font-bold text-white">
                          {item.count}
                          <span className="sr-only"> pending</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* The customer is the one whose money is held, so the reassurance
            sits in their sidebar specifically. */}
        {role === "customer" && (
          <p className="mt-auto flex gap-2.5 rounded-md bg-white/10 p-3.5 text-[10.5px] leading-snug text-white/85">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="mt-px h-4 w-4 flex-none"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>
              <b className="block font-bold text-white">Protected by ONA</b>
              Payments and identities stay on-platform.
            </span>
          </p>
        )}
      </nav>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border-default bg-surface px-4 py-3 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            aria-controls={mobileNavId}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-md border border-border-default text-ink lg:hidden"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-5 w-5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <span className="flex-1" />

          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="min-w-0 text-right">
              <span className="block max-w-28 truncate text-[13.5px] font-bold text-ink sm:max-w-none">
                {user?.display_name ?? "…"}
              </span>
              <span className="block text-[10.5px] text-ink-mute">{ROLE_LABEL[role]}</span>
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-[var(--tap-min)] flex-none rounded-md border border-border-default px-3 text-[13.5px] font-bold text-ink-dim transition-colors hover:border-ink-mute hover:text-ink sm:px-4"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 bg-surface-alt px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
