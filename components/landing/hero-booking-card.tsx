import { Check, Clock3, ShieldCheck } from "lucide-react";

import type { Room } from "@/lib/api/studio";

/**
 * The hero's product visual: what booking at ONA looks like (ui-v2.md —
 * "the hero visual is the product itself").
 *
 * The room and its hourly rate are real, from the catalogue API. The days
 * and times are an illustration of the picker, so the card says so in a
 * visible "Example" label — the booking must never lie (PRODUCT.md), and a
 * made-up "free at 12:00" presented as live availability would.
 *
 * Server component, decorative to assistive tech except for its summary.
 */

const TIMES: { t: string; state: "free" | "taken" | "picked" }[] = [
  { t: "10:00", state: "taken" },
  { t: "11:00", state: "free" },
  { t: "12:00", state: "picked" },
  { t: "13:00", state: "picked" },
  { t: "14:00", state: "free" },
  { t: "15:00", state: "taken" },
  { t: "16:00", state: "free" },
  { t: "17:00", state: "free" },
];

function upcomingDays(): { dow: string; day: string }[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", weekday: "short", day: "numeric" });
  return Array.from({ length: 4 }, (_, i) => {
    const [dow, day] = fmt.format(new Date(Date.now() + (i + 1) * 86_400_000)).split(" ");
    return { dow, day };
  });
}

export function HeroBookingCard({ room }: { room: Room | null }) {
  const days = upcomingDays();
  return (
    <figure
      aria-label="Example of booking a studio session at ONA"
      className="relative rounded-xl bg-surface p-5 text-ink shadow-pop ring-1 ring-black/5 sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-black tracking-tight">{room?.name ?? "Live room"}</p>
          <p className="text-[13px] text-ink-mute">
            {room ? `${room.hourly_rate_display} per hour · engineer included` : "Engineer included"}
          </p>
        </div>
        <span className="flex-none rounded-pill bg-surface-sunk px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
          Example
        </span>
      </div>

      <ul aria-hidden="true" className="mb-4 grid grid-cols-4 gap-2">
        {days.map((d, i) => (
          <li
            key={d.dow + d.day}
            className={`rounded-md border px-2 py-2 text-center ${
              i === 1 ? "border-ona-red bg-ona-red/5" : "border-border-default"
            }`}
          >
            <span className="block text-[11.5px] text-ink-mute">{d.dow}</span>
            <span className="block text-[16px] font-black">{d.day}</span>
          </li>
        ))}
      </ul>

      <ul aria-hidden="true" className="mb-5 grid grid-cols-4 gap-2">
        {TIMES.map(({ t, state }) => (
          <li
            key={t}
            className={`rounded-md py-2 text-center text-[13px] font-bold tabular-nums ${
              state === "picked"
                ? "bg-ona-red text-white"
                : state === "taken"
                  ? "bg-surface-sunk text-ink-mute line-through"
                  : "border border-border-default text-ink"
            }`}
          >
            {t}
          </li>
        ))}
      </ul>

      <dl className="mb-4 space-y-2 border-t border-border-soft pt-4 text-[13.5px]">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-ink-dim">
            <Clock3 aria-hidden="true" className="size-4 text-ona-blue" />
            Session
          </dt>
          <dd className="font-bold">12:00–14:00 · 2 hours</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-ink-dim">
            <Check aria-hidden="true" className="size-4 text-ok" />
            Total
          </dt>
          <dd className="font-bold">Shown before you confirm</dd>
        </div>
      </dl>

      <figcaption className="flex items-center gap-2.5 rounded-lg bg-info-bg px-3 py-2.5 text-[13px] text-ona-blue">
        <ShieldCheck aria-hidden="true" className="size-4 flex-none" />
        <span>
          <b className="font-bold">Held by ONA</b> — your payment stays with ONA until the session.
        </span>
      </figcaption>
    </figure>
  );
}
