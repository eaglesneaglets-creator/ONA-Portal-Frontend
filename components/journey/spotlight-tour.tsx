"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * A spotlight tour — the page dims, one real control is lit, and a coach card
 * beside it says what it is for ("2 of 4"). The Superlist / Linear pattern:
 * it points at the actual interface instead of describing it in a modal.
 *
 * Stops find their target by `data-tour="<id>"`; a missing target is skipped,
 * so a tour never breaks when a page changes. Esc or "Skip" ends it; arrow
 * keys move. Focus goes to the card, so keyboard and screen-reader users are
 * taken through it too. `onDone` fires once, however it ends.
 */
export interface TourStop {
  target: string;
  title: string;
  body: string;
}

const PAD = 8;

export function SpotlightTour({ stops, open, onDone }: { stops: TourStop[]; open: boolean; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  // Only targets that are on screen: the desktop sidebar is display:none on a
  // phone, and lighting a 0×0 box there would point at nothing.
  const live = stops.filter((s) => {
    if (typeof document === "undefined") return false;
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    return !!el && el.getClientRects().length > 0;
  });
  const stop = live[i];

  const end = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  // Measure the lit control: now (next frame), after a smooth scroll has
  // settled, and whenever the page moves under it.
  const target = stop?.target;
  useLayoutEffect(() => {
    if (!open || !target) return;
    // A target taller than half the screen (the launch checklist) is lit from
    // its top only, so the coach card has room below it.
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cap = window.innerHeight * 0.5;
      setRect(r.height > cap ? new DOMRect(r.x, r.y, r.width, cap) : r);
    };
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (el && el.offsetHeight > window.innerHeight * 0.5) {
      // Its top, clear of the sticky page header.
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 80, behavior });
    } else {
      el?.scrollIntoView({ block: "center", behavior });
    }
    const raf = window.requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, target]);

  useEffect(() => {
    if (open) card.current?.focus();
  }, [open, i]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, live.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, live.length, end]);

  if (!open || !stop || !rect) return null;

  const last = i === live.length - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const below = rect.bottom + 220 < (typeof window !== "undefined" ? window.innerHeight : 800);
  const cardW = Math.min(340, vw - 32);
  const left = Math.max(16, Math.min(rect.left, vw - cardW - 16));
  const top = below ? rect.bottom + PAD + 12 : Math.max(16, rect.top - PAD - 12 - 190);

  return (
    <div className="fixed inset-0 z-[55]" role="presentation">
      {/* The lit hole: one element whose huge shadow is the dimmed page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed rounded-xl ring-2 ring-white/80 transition-all duration-300 motion-reduce:transition-none"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgb(14 10 24 / 0.62)",
        }}
      />
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed rounded-xl bg-ona-gradient p-4 text-white shadow-2xl outline-none"
        style={{ top, left, width: cardW }}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/80">
            {i + 1} of {live.length}
          </span>
          <button type="button" onClick={end} className="grid size-11 place-items-center rounded-md text-white/85 hover:bg-white/15 md:size-8" aria-label="Skip the tour">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mb-3 flex gap-1" aria-hidden="true">
          {live.map((_, n) => (
            <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
        <h2 id="tour-title" className="text-[18px] font-black leading-tight">{stop.title}</h2>
        <p id="tour-body" className="mt-1 text-[14px] leading-relaxed text-white/90">{stop.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-11 text-white hover:bg-white/15 hover:text-white md:h-9" onClick={end}>
            Skip
          </Button>
          <div className="flex gap-2">
            {i > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-11 text-white hover:bg-white/15 hover:text-white md:h-9" onClick={() => setI(i - 1)}>
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            ) : null}
            <Button type="button" size="sm" className="h-11 bg-white font-bold text-ona-blue hover:bg-white/90 md:h-9" onClick={() => (last ? end() : setI(i + 1))}>
              {last ? "Got it" : "Next"}
              {last ? null : <ArrowRight aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
