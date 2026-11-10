"use client";

/**
 * Public top bar — UI v2 (docs/design/ui-v2.md, landing §1).
 *
 * Sticky, translucent over the page, with the three things a visitor looks
 * for (how it works, rooms and prices, questions) and the two actions they
 * take. On phones the links fold into a sheet; the primary action stays in
 * the bar, because booking is the job (PRODUCT.md principle 3).
 *
 * On the homepage each link is a section of that page: clicking scrolls
 * there smoothly and the link for the section on screen is marked. Anywhere
 * else the same links go to the page that holds the answer.
 *
 * Only links to things that exist. The marketplace links arrive with v0.2.
 */

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const BOOK_HREF = "/register?next=%2Fcustomer%2Fbook";

/** In the order the sections come on the homepage. */
const LINKS = [
  { section: "how", page: "/#how", label: "How it works" },
  { section: "rooms", page: "/studio", label: "Rooms & prices" },
  { section: "faq", page: "/faqs", label: "Questions" },
];

/** The sheet's close animation; scrolling waits for it to release the page. */
const SHEET_CLOSE_MS = 320;

function onScroll(notify: () => void) {
  window.addEventListener("scroll", notify, { passive: true });
  return () => window.removeEventListener("scroll", notify);
}

function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  window.history.pushState(null, "", `#${id}`);
  // Keyboard and screen-reader users land in the section, not back at the top.
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const router = useRouter();
  const onHome = usePathname() === "/";
  const scrolled = useSyncExternalStore(onScroll, () => window.scrollY > 8, () => false);

  // Which section is on screen: the one crossing a line just above the middle.
  useEffect(() => {
    if (!onHome) return;
    const seen = new IntersectionObserver(
      (entries) =>
        setActive((current) => {
          let next = current;
          for (const e of entries) {
            if (e.isIntersecting) next = e.target.id;
            else if (next === e.target.id) next = null;
          }
          return next;
        }),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const l of LINKS) {
      const el = document.getElementById(l.section);
      if (el) seen.observe(el);
    }
    return () => seen.disconnect();
  }, [onHome]);

  /** On the homepage, scroll to the section; if it is not on the page, go to its page. */
  function go(e: MouseEvent, l: (typeof LINKS)[number], fromSheet = false) {
    if (fromSheet) setOpen(false);
    if (!onHome) return;
    e.preventDefault();
    const move = () => {
      if (!scrollToSection(l.section)) router.push(l.page);
    };
    if (fromSheet) window.setTimeout(move, SHEET_CLOSE_MS);
    else move();
  }

  const hrefFor = (l: (typeof LINKS)[number]) => (onHome ? `#${l.section}` : l.page);
  const current = onHome ? active : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-200",
        scrolled ? "border-border-default bg-surface/95 shadow-card" : "border-border-soft/80 bg-surface/85",
      )}
    >
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
          {LINKS.map((l) => {
            const on = current === l.section;
            return (
              <Link
                key={l.section}
                href={hrefFor(l)}
                onClick={(e) => go(e, l)}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 text-[14px] font-bold transition-colors hover:bg-surface-sunk hover:text-ink",
                  "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:rounded-pill after:bg-ona-red after:transition-transform after:duration-300 motion-reduce:after:transition-none",
                  on ? "text-ink after:scale-x-100" : "text-ink-dim after:scale-x-0",
                )}
              >
                {l.label}
              </Link>
            );
          })}
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
                {LINKS.map((l) => (
                  <Link
                    key={l.section}
                    href={hrefFor(l)}
                    onClick={(e) => go(e, l, true)}
                    aria-current={current === l.section ? "location" : undefined}
                    className={cn(
                      "flex min-h-[var(--tap-min)] items-center rounded-md px-3 text-[15px] font-bold hover:bg-surface-sunk",
                      current === l.section ? "bg-surface-sunk text-ona-red" : "text-ink",
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[var(--tap-min)] items-center rounded-md px-3 text-[15px] font-bold text-ink hover:bg-surface-sunk"
                >
                  Sign in
                </Link>
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
