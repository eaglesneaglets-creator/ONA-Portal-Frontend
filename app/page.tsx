import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  CalendarClock,
  Headphones,
  Lock,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LandingFaq } from "@/components/landing/faq";
import { SiteFooter } from "@/components/public/site-footer";
import { BOOK_HREF, SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";
import { fetchFaqs } from "@/lib/api/content";
import { fetchCatalogue, type Room } from "@/lib/api/studio";

/**
 * Homepage — UI v2 (docs/design/ui-v2.md, landing §1–9).
 *
 * Keeps the ONA identity exactly: the blue→red gradient over the hero
 * photograph, the logo, Lato, the token palette. The page runs: a hero that
 * states the offer and carries the four promises, a bento of guarantees,
 * the booking steps, live rooms and prices, and real-policy answers.
 *
 * No social proof: ONA has no testimonials, logos or statistics yet, and
 * PRODUCT.md forbids inventing them. Rooms and prices come from the API
 * (ISR, 60s) and the page fails soft without it.
 *
 * hero-studio.jpg is a stock photograph, not ONA's own room: "Silver and black
 * studio microphone condenser" by Jonathan Velasquez, CC0 (public domain),
 * from Wikimedia Commons. It shows equipment and no people, so it sets a
 * mood without passing another studio off as ONA's. Replace it with ONA's
 * photograph when there is one, under a new file name (the image optimiser
 * and browsers cache by name, so a same-name swap shows the old picture),
 * and check the subject still sits right of centre (object-position).
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "ONA Records — Book studio time in Accra" },
  description:
    "Book a recording room and engineer at ONA Records in Accra. Clear hourly prices, Mobile Money, and a slot that is genuinely yours.",
};

const SECTION = "py-[clamp(72px,10vw,128px)]";
const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6";

const PROMISES = [
  { icon: Headphones, label: "Engineer included" },
  { icon: Smartphone, label: "Mobile Money or bank transfer" },
  { icon: ShieldCheck, label: "Payment held by ONA" },
  { icon: Lock, label: "Prices fixed before you confirm" },
];

const STEPS = [
  { title: "Pick a room, engineer and time", body: "Live availability. A slot shown as free is free." },
  { title: "Confirm and pay ONA", body: "See the total first. Secure it with a 50% deposit by Mobile Money; the balance is due on the day." },
  { title: "ONA confirms it", body: "You get a reference and an invoice by email, and a reminder the day before." },
  { title: "Record", body: "Turn up, plug in, make the thing. Your payment was with ONA the whole time." },
];

const roomHref = (r: Room) => `/register?next=${encodeURIComponent(`/customer/book?room=${r.id}`)}`;

export default async function Home() {
  const [{ rooms, services, unavailable }, faqs] = await Promise.all([fetchCatalogue(), fetchFaqs()]);
  const featured = rooms.slice(0, 3);
  // ONA prices by service: a room shows where prices start, not a rate of its own.
  const cheapest = [...services].sort((a, b) => a.base_price_pesewas - b.base_price_pesewas)[0];

  return (
    <>
      <SiteHeader />
      <main>
        {/* 2 · Hero — a studio photograph in the brand's colours, the pitch on
            its dark side, and the four promises along its foot. */}
        <section className="bg-ona-hero relative isolate overflow-hidden text-white">
          <Image
            src="/hero-studio.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-30 object-cover object-[78%_center] sm:object-[70%_center]"
          />
          {/* Hue from the brand gradient, light from the photograph. */}
          <div aria-hidden="true" className="bg-ona-gradient absolute inset-0 -z-20 opacity-80 mix-blend-color" />
          {/* Darkness where the words are; the subject stays lit. */}
          <div aria-hidden="true" className="ona-hero-scrim absolute inset-0 -z-10" />

          <div className={`${WRAP} flex min-h-[min(88svh,760px)] flex-col justify-center pb-10 pt-16 sm:pt-24 lg:pt-28`}>
            <div className="max-w-[620px]">
              <p className="ona-rise mb-6 inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-[12.5px] font-bold tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
                <span aria-hidden="true" className="size-1.5 rounded-pill bg-ona-red ring-2 ring-white/40" />
                Recording studio · Accra
              </p>
              <h1 className="ona-rise mb-6 text-[clamp(40px,6.4vw,72px)] font-black leading-[1.0] tracking-[-0.025em] [animation-delay:70ms]">
                Book the room.
                <br />
                Keep your money safe.
              </h1>
              <p className="ona-rise mb-9 max-w-[44ch] text-[17px] leading-relaxed text-white/90 [animation-delay:140ms] sm:text-[19px]">
                Pick a room and an engineer, see the price before you commit, and pay ONA — who
                holds it until your session.
              </p>
              <div className="ona-rise flex flex-wrap gap-3 [animation-delay:210ms]">
                <Button asChild className="h-13 bg-white px-7 text-[15.5px] font-bold text-ona-red shadow-pop hover:bg-white/90">
                  <Link href={BOOK_HREF}>
                    Book studio time <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-13 border-white/45 bg-white/5 px-7 text-[15.5px] font-bold text-white backdrop-blur-sm hover:border-white hover:bg-white/15 hover:text-white"
                >
                  <Link href="/studio">See rooms &amp; prices</Link>
                </Button>
              </div>
            </div>

            {/* 3 · What every booking includes — facts, not social proof */}
            <ul
              aria-label="What every booking includes"
              className="ona-rise mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-md [animation-delay:300ms] lg:mt-20 lg:grid-cols-4"
            >
              {PROMISES.map(({ icon: Icon, label }) => (
                <li key={label} className="ona-hero-cell flex items-center gap-3 px-4 py-4 text-[13.5px] font-bold leading-snug sm:px-5 sm:py-5 sm:text-[14.5px]">
                  <Icon aria-hidden="true" className="size-5 flex-none text-white/85" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 · Bento — the guarantees, the lead tile carries the escrow promise */}
        <section aria-labelledby="why-h" className={`bg-surface-alt ${SECTION}`}>
          <div className={WRAP}>
            <SectionHead
              id="why-h"
              eyebrow="Why ONA"
              title="A booking you can trust with your money"
              body="The booking never lies. What you see as free is free, and what you confirm is held for you."
            />
            <div className="ona-reveal grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto]">
              {/* Lead tile */}
              <article className="bg-ona-gradient relative overflow-hidden rounded-xl p-6 text-white sm:p-8 md:col-span-2 lg:row-span-2">
                <ShieldCheck aria-hidden="true" className="mb-5 size-9 text-white/90" />
                <h3 className="mb-3 max-w-[18ch] text-[clamp(24px,3vw,32px)] font-black leading-tight tracking-tight">
                  Your money is held, not forwarded
                </h3>
                <p className="mb-8 max-w-[44ch] text-[16px] leading-relaxed text-white/85">
                  Every payment goes to ONA first and stays there until your session happens.
                  Nobody is paid directly, so nobody can disappear with it.
                </p>
                <ol aria-label="Where your money goes" className="grid gap-2 sm:grid-cols-4">
                  {["You pay ONA", "ONA holds it", "You record", "ONA settles"].map((s, i) => (
                    <li key={s} className="flex items-center gap-2 rounded-lg bg-white/12 px-3 py-2.5 text-[13.5px] font-bold ring-1 ring-white/20">
                      <span className="grid size-6 flex-none place-items-center rounded-pill bg-white text-[12px] font-black text-ona-red">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </article>

              <Tile icon={CalendarCheck2} title="A free slot is really free">
                Two bookings can never hold the same room or engineer at once. The database refuses
                it, not just the form.
              </Tile>
              <Tile icon={Lock} title="The price you see is the price">
                Hourly rates are on the page. Your total is shown before you confirm and does not
                change afterwards.
              </Tile>
              <Tile icon={CalendarClock} title="Move or cancel in a few taps">
                Until your session starts, from your bookings page. The slot goes back for someone
                else.
              </Tile>
              <Tile icon={ReceiptText} title="Paperwork, done">
                A booking reference straight away, an invoice by email and a receipt once you have
                paid.
              </Tile>
              <Tile icon={BellRing} title="A reminder the day before">
                So the session never sneaks up on you — with the room, the time and your reference.
              </Tile>
            </div>
          </div>
        </section>

        {/* 5 · How booking works */}
        <section id="how" aria-labelledby="how-h" className={`scroll-mt-20 bg-surface ${SECTION}`}>
          <div className={WRAP}>
            <SectionHead id="how-h" eyebrow="How it works" title="From idea to session in four steps" />
            {/* One path, not four boxes: a rail joins the numbers — down the
                side on a phone, across the top on a wide screen. */}
            <ol className="ona-reveal grid lg:grid-cols-4 lg:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 pb-9 last:pb-0 lg:block lg:pb-0">
                  {i < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-5 top-11 w-px -translate-x-1/2 bg-border-default lg:bottom-auto lg:left-13 lg:top-5 lg:h-px lg:w-[calc(100%-2.5rem)] lg:translate-x-0"
                    />
                  ) : null}
                  <span className="relative grid size-10 flex-none place-items-center rounded-pill bg-ona-red text-[15px] font-black text-white">
                    {i + 1}
                  </span>
                  <div className="lg:mt-5 lg:pr-4">
                    <h3 className="mb-1.5 text-[17px] font-black tracking-tight text-ink">{s.title}</h3>
                    <p className="text-[14.5px] leading-relaxed text-ink-dim">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6 · Rooms & prices, live from the API */}
        <section id="rooms" aria-labelledby="rooms-h" className={`scroll-mt-20 bg-ona-wash ${SECTION}`}>
          <div className={WRAP}>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <SectionHead id="rooms-h" eyebrow="Rooms & prices" title="Pick your room" inline />
              <Button asChild variant="outline" className="h-11 bg-surface font-bold">
                <Link href="/studio">
                  All rooms and services <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {unavailable || featured.length === 0 ? (
              <p className="rounded-xl border border-border-default bg-surface px-6 py-10 text-center text-[15px] text-ink-dim">
                Rooms and prices are taking a moment to load.{" "}
                <Link href="/studio" className="font-bold text-ona-red underline-offset-2 hover:underline">
                  See them on the studio page
                </Link>
                .
              </p>
            ) : (
              <ul className="ona-reveal grid gap-4 md:grid-cols-3">
                {featured.map((r) => (
                  <li key={r.id} className="flex flex-col rounded-xl border border-border-default bg-surface p-6 shadow-card">
                    <h3 className="mb-2 text-[19px] font-black tracking-tight text-ink">{r.name}</h3>
                    {r.description ? (
                      <p className="mb-4 line-clamp-3 text-[14.5px] leading-relaxed text-ink-dim">{r.description}</p>
                    ) : null}
                    <p className="mb-6 flex items-center gap-2 text-[13.5px] text-ink-mute">
                      <Users aria-hidden="true" className="size-4" />
                      Up to {r.capacity} {r.capacity === 1 ? "person" : "people"} · engineer included
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-border-soft pt-4">
                      <p>
                        {r.hourly_rate_pesewas ? (
                          <>
                            <span className="block text-[22px] font-black leading-none text-ink">{r.hourly_rate_display}</span>
                            <span className="text-[13px] text-ink-mute">room hire per hour</span>
                          </>
                        ) : cheapest ? (
                          <>
                            <span className="block text-[13px] text-ink-mute">From</span>
                            <span className="block text-[22px] font-black leading-none text-ink">{cheapest.base_price_display}</span>
                            <span className="text-[13px] text-ink-mute">{cheapest.unit_label}</span>
                          </>
                        ) : null}
                      </p>
                      <Button asChild className="h-11 font-bold">
                        <Link href={roomHref(r)} aria-label={`Book ${r.name}`}>
                          Book
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 7 · Questions — staff-edited; the section waits for real answers */}
        {faqs && faqs.length ? (
        <section id="faq" aria-labelledby="faq-h" className={`scroll-mt-20 bg-surface ${SECTION}`}>
          <div className={`${WRAP} grid gap-10 lg:grid-cols-[1fr_1.6fr]`}>
            <div>
              <SectionHead
                id="faq-h"
                eyebrow="Questions"
                title="Good to know before you book"
                body="Anything else? Book a session and add a note — ONA reads every one."
                inline
              />
            </div>
            <div>
              <LandingFaq items={faqs.slice(0, 6)} />
              {faqs.length > 6 ? (
                <Link href="/faqs" className="mt-4 inline-flex min-h-11 items-center font-bold text-ona-red hover:underline">
                  All {faqs.length} questions <ArrowRight aria-hidden="true" className="ml-1 size-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </section>
        ) : null}

        {/* 8 · Closing call to action */}
        <section className={`bg-surface pb-[clamp(72px,10vw,128px)]`}>
          <div className={WRAP}>
            <div className="ona-reveal bg-ona-gradient relative overflow-hidden rounded-xl px-6 py-12 text-center text-white sm:px-10 sm:py-16">
              <Image src="/ona-icon.png" alt="" width={56} height={56} className="mx-auto mb-5 rounded-pill bg-white p-1.5 ring-4 ring-white/20" />
              <h2 className="mb-3 text-[clamp(26px,4vw,40px)] font-black tracking-tight">Ready to make something real?</h2>
              <p className="mx-auto mb-8 max-w-[44ch] text-[16px] leading-relaxed text-white/85">
                Pick a room for this week. It takes about two minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild className="h-12 bg-white px-7 text-[15px] font-bold text-ona-red hover:bg-white/90">
                  <Link href={BOOK_HREF}>Book studio time</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-white/50 bg-transparent px-7 text-[15px] font-bold text-white hover:border-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SectionHead({
  id,
  eyebrow,
  title,
  body,
  inline = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body?: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "max-w-[40ch]" : "mb-10 max-w-[56ch]"}>
      <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.14em] text-ona-red">{eyebrow}</p>
      <h2 id={id} className="text-[clamp(26px,3.6vw,38px)] font-black leading-tight tracking-tight text-ink">
        {title}
      </h2>
      {body ? <p className="mt-3 text-[16px] leading-relaxed text-ink-dim">{body}</p> : null}
    </div>
  );
}

function Tile({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border-default bg-surface p-6">
      <span aria-hidden="true" className="mb-4 grid size-10 place-items-center rounded-lg bg-surface-alt text-ona-blue">
        <Icon className="size-5" />
      </span>
      <h3 className="mb-1.5 text-[17px] font-black tracking-tight text-ink">{title}</h3>
      <p className="text-[14.5px] leading-relaxed text-ink-dim">{children}</p>
    </article>
  );
}
