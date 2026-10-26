import Image from "next/image";
import Link from "next/link";

/**
 * Public footer, from the approved homepage template.
 *
 * Only links to pages that exist. The template's Professionals column
 * (marketplace) is omitted until v0.2 ships it (ADR-015) — a dead link in
 * a footer is the first thing a careful visitor clicks.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-soft bg-surface-alt">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <Image src="/ona-icon.png" alt="" width={32} height={32} className="rounded-pill" />
            <span className="text-[15px] font-black tracking-[0.02em] text-ink">ONA Records</span>
          </div>
          <p className="mb-2 text-[13px] italic text-ink-mute">Onyame Nsa Ano — the handiwork of God</p>
          <p className="max-w-[40ch] text-[14px] leading-relaxed text-ink-dim">
            A recording studio in Accra, with a marketplace of vetted creative professionals on
            the way.
          </p>
        </div>

        <nav aria-labelledby="f-book">
          <h2 id="f-book" className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            Book
          </h2>
          <ul className="space-y-2 text-[14px]">
            <li><Link className="text-ink-dim hover:text-ink" href="/studio">Studio time &amp; prices</Link></li>
            <li><Link className="text-ink-dim hover:text-ink" href="/register">Create an account</Link></li>
            <li><Link className="text-ink-dim hover:text-ink" href="/login">Sign in</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="f-help">
          <h2 id="f-help" className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-ink-mute">
            Help
          </h2>
          <ul className="space-y-2 text-[14px] text-ink-dim">
            <li><Link className="text-ink-dim hover:text-ink" href="/#how">How booking works</Link></li>
            <li><Link className="text-ink-dim hover:text-ink" href="/faqs">Questions</Link></li>
            <li>Accra, Ghana · payments in GHS</li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-border-soft px-5 py-5 text-center text-[12px] text-ink-mute">
        © {new Date().getFullYear()} ONA Records Creative Services
      </p>
    </footer>
  );
}
