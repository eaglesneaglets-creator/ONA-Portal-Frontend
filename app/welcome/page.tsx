"use client";

import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  CalendarCheck2,
  Clapperboard,
  Compass,
  Guitar,
  Hourglass,
  Mic,
  Music4,
  SlidersHorizontal,
  Smartphone,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchCatalogueFromBrowser } from "@/lib/api/bookings";
import { updateJourney, type Intent } from "@/lib/api/journey";
import type { Service } from "@/lib/api/studio";
import { RequireAuth } from "@/lib/auth/guard";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

/**
 * /welcome — the first thing a new customer sees after signing up.
 *
 * Three short steps, split-screen (HubSpot / Airbnb): ONA's brand on one side,
 * one decision at a time on the other.
 *   1. "What brings you to ONA?" — one question, and the answer visibly
 *      shapes step 3 (intent-based routing, the Duolingo / HubSpot lesson:
 *      a question whose answer changes nothing is a question not worth asking).
 *   2. How a session works — the four moments of ONA's booking terms, so the
 *      1-hour hold and the 50% deposit are never a surprise later.
 *   3. Picked for you — real services from the catalogue, with a straight
 *      line into booking one.
 * Skippable at every step; finishing or skipping marks the customer welcomed.
 */
const INTENTS: { key: Intent; label: string; hint: string; icon: typeof Mic; match: string[] }[] = [
  { key: "record", label: "Record music", hint: "Vocals, a band, overdubs", icon: Mic, match: ["record"] },
  { key: "mix", label: "Mix & master", hint: "Finish a track you have", icon: SlidersHorizontal, match: ["mix", "master"] },
  { key: "produce", label: "Produce a track", hint: "Beats, arrangement, sound", icon: AudioLines, match: ["production", "produce", "beat"] },
  { key: "rehearse", label: "Rehearse", hint: "A treated room for the band", icon: Guitar, match: ["rehears", "day pass", "full day"] },
  { key: "video", label: "Shoot a video", hint: "Music video or live session", icon: Clapperboard, match: ["video", "shoot", "live session"] },
  { key: "content", label: "Make content", hint: "Short clips for socials", icon: Smartphone, match: ["social", "content"] },
  { key: "browse", label: "Just looking", hint: "Show me around", icon: Compass, match: [] },
];

const HOW = [
  { icon: CalendarCheck2, title: "Book in a minute", body: "Pick the service and a time. The price is shown up front, engineer included." },
  { icon: Hourglass, title: "Your slot is held for an hour", body: "Nobody else can take it while you pay." },
  { icon: Wallet, title: "Pay a 50% deposit", body: "By Mobile Money on Paystack. A small processing fee is shown before you pay." },
  { icon: Music4, title: "Come in and make it", body: "Pay the balance on the day. Need to move it? Give 48 hours and your deposit carries over." },
];

export default function WelcomePage() {
  return (
    <RequireAuth>
      <Welcome />
    </RequireAuth>
  );
}

function Welcome() {
  const router = useRouter();
  const firstName = useAuthStore((s) => s.user?.first_name);
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    fetchCatalogueFromBrowser()
      .then((c) => setServices(c.services))
      .catch(() => setServices([]));
  }, []);

  const picks = useMemo(() => {
    const words = INTENTS.find((i) => i.key === intent)?.match ?? [];
    const hit = services.filter((s) => words.some((w) => `${s.name} ${s.category}`.toLowerCase().includes(w)));
    return (hit.length ? hit : services).slice(0, 3);
  }, [intent, services]);

  async function finish(to: string) {
    try {
      await updateJourney({ welcomed: true, ...(intent ? { intent } : {}) });
    } catch {
      /* the welcome is a nicety; never trap someone on it */
    }
    router.replace(to);
  }

  const steps = ["What brings you here", "How it works", "Picked for you"];

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand side */}
      <aside className="bg-ona-gradient relative overflow-hidden px-5 py-6 text-white sm:px-10 sm:py-8 lg:py-12">
        <div className="flex items-center gap-3">
          <Image src="/ona-icon.png" alt="" width={40} height={40} className="rounded-full bg-white/95 p-0.5" priority />
          <span className="text-[15px] font-black tracking-tight">ONA Records</span>
        </div>
        <div className="mt-6 max-w-md sm:mt-10 lg:mt-24">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-white/75">Welcome{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="mt-3 text-[clamp(26px,4.4vw,52px)] font-black leading-[1.02] tracking-tight text-balance">
            Let&rsquo;s get your first session on the calendar.
          </h1>
          {/* On a phone the question matters more than the pitch: keep it above the fold. */}
          <p className="mt-4 hidden max-w-[42ch] text-[16px] leading-relaxed text-white/85 sm:block">
            Three quick steps. You can skip any of them — your workspace has a guide that picks up where you left off.
          </p>
        </div>
        {/* The studio's own motif: a level meter, ambient on this side only. */}
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-6 hidden h-48 items-end gap-2 opacity-80 sm:flex lg:right-10">
          {[0.55, 0.85, 0.7, 1, 0.6, 0.9, 0.45, 0.75].map((h, i) => (
            <span
              key={i}
              className="ona-eq-bar block w-4 rounded-t-md bg-white/25"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms`, animationDuration: `${700 + (i % 3) * 140}ms` }}
            />
          ))}
        </div>
        <p className="relative mt-10 hidden text-[13px] italic text-white/70 lg:absolute lg:bottom-8 lg:left-10 lg:block">
          Onyame Nsa Ano — the handiwork of God
        </p>
      </aside>

      {/* Step side */}
      <main className="flex flex-col px-5 py-6 sm:px-10 sm:py-8 lg:py-12">
        <div className="flex items-center justify-between gap-4">
          <ol className="flex flex-1 gap-2" aria-label="Welcome steps">
            {steps.map((label, i) => (
              <li key={label} className="flex-1" aria-current={i === step ? "step" : undefined}>
                <span className={cn("block h-1.5 rounded-full transition-colors", i <= step ? "bg-ona-gradient" : "bg-border-default")} />
                <span className={cn("mt-2 hidden text-[12px] font-bold sm:block", i === step ? "text-ink" : "text-ink-mute")}>{label}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => void finish("/customer")} className="min-h-11 flex-none text-[14px] font-bold text-ink-dim hover:text-ink" data-testid="welcome-skip">
            Skip
          </button>
        </div>

        <section key={step} className="ona-rise mt-6 flex-1 sm:mt-10" aria-live="polite">
          {step === 0 ? (
            <>
              <h2 className="text-[clamp(24px,3vw,34px)] font-black tracking-tight text-ink">What brings you to ONA?</h2>
              <p className="mt-1 text-[15.5px] text-ink-dim">Pick the closest. We will show you the right services first.</p>
              <div role="radiogroup" aria-label="What brings you to ONA" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {INTENTS.map(({ key, label, hint, icon: Icon }) => {
                  const on = intent === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-testid={`intent-${key}`}
                      onClick={() => setIntent(key)}
                      className={cn(
                        "group flex min-h-[88px] items-center gap-4 rounded-2xl border-2 bg-surface p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ona-blue",
                        on ? "border-ona-red shadow-[0_8px_24px_-12px_rgba(201,0,7,0.45)]" : "border-border-default hover:-translate-y-0.5 hover:border-ink-mute/50",
                      )}
                    >
                      <span className={cn("grid size-12 flex-none place-items-center rounded-xl transition-colors", on ? "bg-ona-gradient text-white" : "bg-surface-sunk text-ona-blue")}>
                        <Icon aria-hidden="true" className="size-6" />
                      </span>
                      <span>
                        <b className="block text-[16px] text-ink">{label}</b>
                        <span className="text-[13.5px] text-ink-mute">{hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : step === 1 ? (
            <>
              <h2 className="text-[clamp(24px,3vw,34px)] font-black tracking-tight text-ink">How a session works</h2>
              <p className="mt-1 text-[15.5px] text-ink-dim">Four moments, from booking to the studio.</p>
              <ol className="relative mt-8 grid gap-6 border-l-2 border-dashed border-border-default pl-8">
                {HOW.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="ona-rise relative" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="absolute -left-[53px] grid size-11 place-items-center rounded-full bg-ona-gradient text-white ring-4 ring-surface">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <b className="block text-[17px] text-ink">{title}</b>
                    <span className="block max-w-[52ch] text-[14.5px] text-ink-dim">{body}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <h2 className="text-[clamp(24px,3vw,34px)] font-black tracking-tight text-ink">
                {intent && intent !== "browse" ? "Picked for you" : "Popular at ONA"}
              </h2>
              <p className="mt-1 text-[15.5px] text-ink-dim">Engineer included. Book one now, or look around first.</p>
              <ul className="mt-6 grid gap-3 xl:grid-cols-3" data-testid="welcome-picks">
                {picks.map((s) => (
                  <li key={s.id} className="flex flex-col rounded-2xl border border-border-default bg-surface p-5 shadow-card">
                    {s.category ? <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ona-red">{s.category}</span> : null}
                    <b className="mt-1 text-[17px] text-ink">{s.name}</b>
                    <span className="mt-1 text-[15px] font-black text-ink">
                      {s.base_price_display} <span className="font-normal text-ink-mute">{s.unit_label}</span>
                    </span>
                    <span className="mt-2 line-clamp-3 flex-1 text-[13.5px] text-ink-dim">{s.description}</span>
                    <Button className="mt-4 h-11 font-bold" onClick={() => void finish(`/customer/book?service=${s.id}`)}>
                      Book this
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[14px] text-ink-dim">
                Prefer to browse?{" "}
                <Link href="/studio" className="font-bold text-ona-blue hover:underline" onClick={() => void updateJourney({ welcomed: true, ...(intent ? { intent } : {}) }).catch(() => {})}>
                  See every service and price
                </Link>
              </p>
            </>
          )}
        </section>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-soft pt-6">
          {step > 0 ? (
            <Button variant="outline" className="h-11 px-5 font-bold" onClick={() => setStep(step - 1)}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button className="h-11 px-6 font-bold" disabled={step === 0 && !intent} onClick={() => setStep(step + 1)} data-testid="welcome-next">
              {step === 0 ? "Continue" : "Show me what to book"}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="outline" className="h-11 px-5 font-bold" onClick={() => void finish("/customer")}>
              Go to my workspace
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
