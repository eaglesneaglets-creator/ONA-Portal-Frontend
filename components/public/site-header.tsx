"use client";

/**
 * Public top bar — UI v2 (docs/design/ui-v2.md, landing §1).
 *
 * Sticky, translucent over the page, with the three things a visitor looks
 * for (rooms and prices, how it works, questions) and the two actions they
 * take. On phones the links fold into a sheet; the primary action stays in
 * the bar, because booking is the job (PRODUCT.md principle 3).
 *
 * Only links to things that exist. The marketplace links arrive with v0.2.
 */

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const BOOK_HREF = "/register?next=%2Fcustomer%2Fbook";

const LINKS = [
  { href: "/studio", label: "Rooms & prices" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "Questions" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-soft/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-h-[var(--tap-min)] items-center gap-2.5">
          <Image src="/ona-icon.png" alt="" width={32} height={32} className="rounded-pill" priority />
          <span>
            <span className="block text-[15px] font-black leading-none tracking-[0.02em] text-ink">ONA</span>
            <span className="mt-[3px] block text-[9.5px] tracking-[0.3em] text-ink-mute">RECORDS</span>
          </span>
          <span className="sr-only">ONA Records home</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-[14px] font-bold text-ink-dim transition-colors hover:bg-surface-sunk hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" className="hidden h-10 px-3 text-[14px] font-bold text-ink-dim sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-11 px-4 text-[14px] font-bold md:h-10">
            <Link href={BOOK_HREF}>Book a session</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] max-w-xs gap-0 p-0">
              <SheetHeader className="border-b border-border-soft p-5">
                <SheetTitle className="text-[17px] font-black">Menu</SheetTitle>
                <SheetDescription>ONA Records, Accra</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col p-3">
                {[...LINKS, { href: "/login", label: "Sign in" }].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[var(--tap-min)] items-center rounded-md px-3 text-[15px] font-bold text-ink hover:bg-surface-sunk"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto border-t border-border-soft p-5">
                <Button asChild className="h-11 w-full font-bold">
                  <Link href={BOOK_HREF} onClick={() => setOpen(false)}>
                    Book a session
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
