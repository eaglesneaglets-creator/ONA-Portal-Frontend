"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchCalendar,
  fmtShortDay,
  fmtTime,
  groupSlotsByDay,
  studioDate,
  type Slot,
} from "@/lib/api/bookings";

/**
 * Pick a new start for a session of fixed length, for a fixed room and
 * engineer — the reschedule half of the customer dashboard.
 *
 * A start is offered only if `hours` consecutive slots from it are free. The
 * booking being moved shows as "booked" in the calendar, but it is the
 * customer's own time, so slots inside `ownStart`–`ownEnd` count as free;
 * the API agrees (it excludes the booking from its own clash check).
 */
export function SlotPicker({
  roomId,
  engineerId,
  hours,
  ownStart,
  ownEnd,
  disabled,
  onPick,
}: {
  roomId: string;
  engineerId: string;
  hours: number;
  ownStart: string;
  ownEnd: string;
  disabled?: boolean;
  onPick: (startIso: string) => void;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // A fortnight around the booking, not from today: a session six weeks
    // out should be movable to nearby days, not only to this fortnight.
    // Starts three days before it, never before today.
    const from = new Date(Math.max(Date.now(), new Date(ownStart).getTime() - 3 * 86_400_000));
    const to = new Date(from.getTime() + 13 * 86_400_000);
    fetchCalendar({ room: roomId, engineer: engineerId, from: studioDate(from), to: studioDate(to) })
      .then((c) => live && setSlots(c.slots))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [roomId, engineerId, ownStart, attempt]);

  const own = useMemo(() => [new Date(ownStart).getTime(), new Date(ownEnd).getTime()], [ownStart, ownEnd]);

  // Free = available, or "booked" only by this very booking.
  const isFree = (s: Slot) => {
    if (s.state === "available") return true;
    const t = new Date(s.start_at).getTime();
    return s.state === "booked" && t >= own[0] && t < own[1];
  };

  const byDay = useMemo(() => groupSlotsByDay(slots ?? []), [slots]);

  /** Starts on a day with `hours` free slots in a row, excluding the current start. */
  const startsFor = (daySlots: Slot[]) =>
    daySlots.filter((s, i) => {
      if (s.start_at === ownStart) return false;
      for (let j = 0; j < hours; j++) {
        const next = daySlots[i + j];
        if (!next || !isFree(next)) return false;
      }
      return true;
    });

  if (failed) {
    return (
      <p className="text-[14px] text-ink">
        Availability could not be loaded.{" "}
        <button
          type="button"
          className="font-bold text-ona-red underline"
          onClick={() => {
            setFailed(false);
            setSlots(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }
  if (!slots) return <p className="text-[14px] text-ink-mute">Checking availability…</p>;

  const days = [...byDay.entries()].map(([k, ss]) => [k, ss, startsFor(ss)] as const);
  const chosen = days.find(([k]) => k === day);

  return (
    <div>
      <ul className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Days">
        {days.map(([k, ss, starts]) => (
          <li key={k} className="flex-none">
            <button
              type="button"
              disabled={starts.length === 0}
              aria-pressed={day === k}
              onClick={() => setDay(k)}
              className={`min-h-[var(--tap-min)] min-w-[84px] rounded-md border px-3 py-1.5 text-center text-[13px] font-bold disabled:cursor-not-allowed disabled:border-border-soft disabled:bg-surface-sunk disabled:text-ink-mute ${
                day === k ? "border-ona-red bg-surface text-ink" : "border-border-default bg-surface text-ink-dim hover:border-ink-mute"
              }`}
            >
              <span className="block">{fmtShortDay(ss[0].start_at)}</span>
              <span className="block text-[11px] font-normal">
                {starts.length ? `${starts.length} free` : "None"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {chosen ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="New start times">
          {chosen[2].map((s) => (
            <li key={s.start_at}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(s.start_at)}
                className="min-h-[var(--tap-min)] w-full rounded-md border border-border-default bg-surface px-2 text-[14px] font-bold text-ink hover:border-ona-red disabled:opacity-50"
              >
                {fmtTime(s.start_at)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-mute">Pick a day to see times. Accra time.</p>
      )}
    </div>
  );
}
