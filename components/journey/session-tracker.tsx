"use client";

import { CalendarPlus, Check, PackageCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";

/**
 * Where a booking is, from booked to session day — the trip tracker of
 * Uber / Airbnb applied to a studio session. Four stops read left to right;
 * the current one pulses gently; a countdown says how long until the session.
 * "Add to calendar" writes a real .ics, and "What to bring" depends on what
 * the session is for.
 */
const BRING: Record<string, string[]> = {
  audio: ["Stems or session files on a drive", "Lyrics and reference tracks", "Your own instrument, if you play"],
  video: ["Outfits and props", "The final audio of the song", "A shot list or reference video"],
  rental: ["Your instruments and setlist", "Leads and pedals you rely on", "Water — the room gets warm"],
};

function bringFor(b: Booking): string[] {
  const c = `${b.service.category} ${b.service.name}`.toLowerCase();
  if (c.includes("video") || c.includes("content")) return BRING.video;
  if (c.includes("rental") || c.includes("rehears") || c.includes("day pass")) return BRING.rental;
  return BRING.audio;
}

function countdown(startIso: string, now: number): string {
  const ms = new Date(startIso).getTime() - now;
  if (ms <= 0) return "Happening now";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return "Starts within the hour";
  if (hours < 24) return `In ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

function icsFor(b: Booking): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (t: string) => t.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ONA Records//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.reference}@onarecords`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(b.start_at)}`,
    `DTEND:${stamp(b.end_at)}`,
    `SUMMARY:${esc(`${b.service.name} at ONA Records`)}`,
    `DESCRIPTION:${esc(`${b.room.name} with ${b.engineer.name}. Reference ${b.reference}.`)}`,
    "LOCATION:ONA Records\\, Accra",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function SessionTracker({ booking: b }: { booking: Booking }) {
  const [now] = useState(() => Date.now());
  const started = new Date(b.start_at).getTime() <= now;
  const stops = [
    { label: "Booked", done: true },
    { label: "Deposit paid", done: b.secured },
    { label: "Balance paid", done: b.outstanding_pesewas === 0 && b.paid_pesewas > 0 },
    { label: "Session day", done: started },
  ];
  const current = stops.findIndex((s) => !s.done);

  function addToCalendar() {
    const url = URL.createObjectURL(new Blob([icsFor(b)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ONA-${b.reference}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mt-5 rounded-xl border border-border-soft bg-surface-alt p-4" data-testid="session-tracker">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-ona-gradient px-3 py-1 text-[12.5px] font-black text-white">{countdown(b.start_at, now)}</span>
        <Button type="button" variant="outline" size="sm" className="h-11 bg-surface md:h-8" onClick={addToCalendar}>
          <CalendarPlus aria-hidden="true" />
          Add to calendar
        </Button>
      </div>

      <ol className="grid grid-cols-4" aria-label="Where this booking is">
        {stops.map((s, i) => (
          <li key={s.label} className="relative flex flex-col items-center text-center" aria-current={i === current ? "step" : undefined}>
            {i > 0 ? (
              <span aria-hidden="true" className={cn("absolute right-1/2 top-3.5 h-0.5 w-full", stops[i - 1].done && s.done ? "bg-ona-gradient" : "bg-border-default")} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 grid size-7 place-items-center rounded-full",
                s.done ? "bg-ok text-white" : i === current ? "bg-surface ring-2 ring-ona-red" : "bg-surface ring-1 ring-border-default",
              )}
            >
              {s.done ? <Check className="size-4" strokeWidth={3} /> : i === current ? <span className="size-2.5 animate-pulse rounded-full bg-ona-red motion-reduce:animate-none" /> : null}
            </span>
            <span className={cn("mt-2 text-[12px] font-bold leading-tight", s.done ? "text-ink" : i === current ? "text-ona-red" : "text-ink-mute")}>
              {s.label}
              <span className="sr-only">{s.done ? " — done" : i === current ? " — next" : ""}</span>
            </span>
          </li>
        ))}
      </ol>

      <details className="group mt-4 border-t border-border-soft pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[13.5px] font-bold text-ink md:min-h-8">
          <PackageCheck aria-hidden="true" className="size-4 text-ona-blue" />
          What to bring
        </summary>
        <ul className="mt-2 grid gap-1 pl-6 text-[13.5px] text-ink-dim">
          {bringFor(b).map((t) => (
            <li key={t} className="list-disc">{t}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
