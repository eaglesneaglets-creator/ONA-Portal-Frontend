import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

/**
 * Homepage — ports docs/design/pages/homepage.html, narrowed to v0.1.
 *
 * What changed from the template, and why (ADR-015: studio first, the
 * marketplace follows as v0.2+):
 *   - "Find a professional", the search bar, the "Creative talent" / "Post a
 *     brief" paths and the sample-professionals strip are omitted. The
 *     sample people are placeholder data, which PRODUCT.md says must never
 *     ship as if real, and the features behind those links do not exist.
 *   - The money explainer describes a studio booking, not a marketplace job.
 *   - No example GHS figure: real prices live on /studio, from the API.
 *
 * Server component, no client JS of its own. Mobile-first (ADR-013):
 * one column at 390px, the explainer moves beside the headline from lg.
 *
 * hero.jpg is a generated placeholder (docs/design/assets/HERO-IMAGE.md);
 * swap the file, keep the path. The brand gradient multiplies over it.
 */

export const metadata: Metadata = {
  title: { absolute: "ONA Records — Book studio time in Accra" },
  description:
    "Book a recording room and engineer at ONA Records in Accra. Clear hourly prices, Mobile Money, and a slot that is genuinely yours.",
};

const FLOW = [
  { title: "Pick your room and time", body: "Live availability. A slot shown as free is free." },
  { title: "Pay ONA", body: "Mobile Money, card or bank, in GHS." },
  { title: "ONA holds it", body: "Your money sits with ONA until the session happens." },
  { title: "Record", body: "Engineer included. If the session can't go ahead, you're refunded." },
];

const GUARDS = [
  {
    title: "Your slot is really yours",
    body: "Two people can never hold the same room or engineer at the same time. The system refuses it, not just the form.",
  },
  {
    title: "Clear prices, before you commit",
    body: "Hourly rates are on the page. The total is shown before you confirm, and it does not change afterwards.",
  },
  {
    title: "Your money is held, not forwarded",
    body: "ONA holds payment until your session. Every booking has a reference and a receipt.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden text-white">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
          <div aria-hidden="true" className="bg-ona-gradient absolute inset-0 -z-10 mix-blend-multiply" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/25" />

          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-24">
            <div>
              <h1 className="mb-5 max-w-[16ch] text-[clamp(34px,6vw,58px)] font-black leading-[1.04] tracking-tight">
                Book the room. Keep your money safe.
              </h1>
              <p className="mb-8 max-w-[48ch] text-[17px] leading-relaxed text-white/85 sm:text-[18px]">
                ONA Records is a recording studio in Accra. Pick a room and an engineer, see the
                price up front, and pay ONA — who holds it until your session.
              </p>
              <div className="mb-8 flex flex-wrap gap-3">
                <Link
                  href="/register?next=%2Fcustomer%2Fbook"
                  className="flex min-h-[var(--tap-min)] items-center rounded-md bg-white px-6 font-bold text-ona-red transition-colors hover:bg-white/90"
                >
                  Book studio time
                </Link>
                <Link
                  href="/studio"
                  className="flex min-h-[var(--tap-min)] items-center rounded-md border border-white/50 px-6 font-bold text-white transition-colors hover:border-white"
                >
                  See rooms &amp; prices
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-bold text-white/85">
                {["Engineer included", "Pay with Mobile Money", "Held by ONA until your session"].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Check />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white/95 p-6 text-ink shadow-card sm:p-7">
              <h2 className="mb-5 text-[19px] font-black tracking-tight">How booking works</h2>
              <ol className="space-y-4">
                {FLOW.map((step, i) => (
                  <li key={step.title} className="flex gap-3.5">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-pill bg-ona-red text-[13px] font-black text-white">
                      {i + 1}
                    </span>
                    <span>
                      <b className="block text-[15px]">{step.title}</b>
                      <span className="text-[13.5px] leading-snug text-ink-dim">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Paths */}
        <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="mb-8 max-w-[56ch]">
            <h2 className="mb-2 text-[clamp(24px,3.4vw,34px)] font-black tracking-tight text-ink">
              Start with what you need
            </h2>
            <p className="text-[16px] leading-relaxed text-ink-dim">
              Studio time is open now. Hiring independent professionals arrives in the next
              release.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/studio"
              className="group rounded-xl border border-border-default bg-surface p-6 transition-shadow hover:shadow-card"
            >
              <h3 className="mb-2 text-[20px] font-black tracking-tight text-ink">Studio time</h3>
              <p className="mb-4 text-[15px] leading-relaxed text-ink-dim">
                Rooms in Accra, an engineer included, priced by the hour.
              </p>
              <span className="text-[14px] font-bold text-ona-red group-hover:underline">
                Check availability →
              </span>
            </Link>
            <div className="rounded-xl border border-dashed border-border-default bg-surface-alt p-6">
              <h3 className="mb-2 text-[20px] font-black tracking-tight text-ink">Creative talent</h3>
              <p className="mb-4 text-[15px] leading-relaxed text-ink-dim">
                Producers, vocalists, videographers and designers — each approved by ONA before
                they appear.
              </p>
              <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-mute">
                Coming next
              </span>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="bg-surface-alt">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="mb-3 max-w-[18ch] text-[clamp(24px,3.4vw,34px)] font-black tracking-tight text-ink">
                Why people trust ONA with the booking
              </h2>
              <p className="max-w-[40ch] text-[16px] leading-relaxed text-ink-dim">
                The booking never lies. What you see as free is free, and what you confirm is held
                for you.
              </p>
            </div>
            <ul className="space-y-5">
              {GUARDS.map((g) => (
                <li key={g.title} className="flex gap-3.5">
                  <span className="mt-1 text-ona-red">
                    <Check />
                  </span>
                  <span>
                    <b className="mb-1 block text-[16px] text-ink">{g.title}</b>
                    <span className="text-[14.5px] leading-relaxed text-ink-dim">{g.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="mb-3 text-[clamp(26px,4vw,40px)] font-black tracking-tight text-ink">
            Ready to make something real?
          </h2>
          <p className="mx-auto mb-8 max-w-[46ch] text-[16px] leading-relaxed text-ink-dim">
            Pick a room for this weekend. It takes about two minutes.
          </p>
          <Link
            href="/register?next=%2Fcustomer%2Fbook"
            className="inline-flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-7 font-bold text-white transition-colors hover:bg-ona-tertiary"
          >
            Book studio time
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 flex-none"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
