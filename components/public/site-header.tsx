import Image from "next/image";
import Link from "next/link";

/**
 * Minimal public top bar.
 *
 * The approved homepage (docs/design/pages/homepage.html) has a full navbar
 * that has not been built yet — app/page.tsx is still the token smoke page.
 * This is the smallest bar that lets a public page exist on its own: brand
 * mark home, and the two actions a visitor actually takes. When the real
 * header lands, pages swap to it and this file goes.
 *
 * Server component: no state, no handlers, ships no JS of its own.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border-soft bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/ona-icon.png" alt="" width={32} height={32} className="rounded-pill" priority />
          <span>
            <span className="block text-[15px] font-black leading-none tracking-[0.02em] text-ink">
              ONA
            </span>
            <span className="mt-[3px] block text-[9.5px] tracking-[0.3em] text-ink-mute">RECORDS</span>
          </span>
          <span className="sr-only">ONA Records home</span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex min-h-[var(--tap-min)] items-center rounded-md px-3 text-[13.5px] font-bold text-ink-dim transition-colors hover:text-ink sm:px-4"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-4 text-[13.5px] font-bold text-white transition-colors hover:bg-ona-tertiary"
          >
            Book a session
          </Link>
        </nav>
      </div>
    </header>
  );
}
