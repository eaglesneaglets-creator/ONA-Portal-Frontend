"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { FormError } from "@/components/auth/fields";
import { SlotPicker } from "@/components/booking/slot-picker";
import { StatusPill } from "@/components/booking/status-pill";
import { ApiError } from "@/lib/api/errors";
import {
  cancelBooking,
  fmtDay,
  fmtTime,
  listBookings,
  rescheduleBooking,
  type Booking,
} from "@/lib/api/bookings";

/**
 * /customer/bookings — every booking, with cancel and reschedule.
 *
 * Task 12. Upcoming and past come from the API already split and ordered;
 * whether a booking may still change is the API's `can_change`, never
 * re-derived here. Invoices and payment history join this page with
 * Tasks 10 and 8.
 */

type Tab = "upcoming" | "past";

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const f = err.fieldErrors;
    for (const key of ["start_at", "hours"]) if (f[key]?.length) return f[key][0];
    return err.formError;
  }
  return "Something went wrong. Please try again.";
}

export default function BookingsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listBookings(tab)
      .then((r) => {
        if (!live) return;
        setRows(r);
        setLoadFailed(false);
      })
      .catch(() => live && setLoadFailed(true));
    return () => {
      live = false;
    };
  }, [tab, reload]);

  const refresh = useCallback((message: string) => {
    setNotice(message);
    setReload((n) => n + 1);
  }, []);

  function switchTab(t: Tab) {
    if (t === tab) return;
    setRows(null);
    setNotice(null);
    setTab(t);
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(26px,4vw,34px)] font-black tracking-tight text-ink">Your bookings</h1>
          <p className="text-[14.5px] text-ink-dim">Times are Accra time.</p>
        </div>
        <Link
          href="/customer/book"
          className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-5 font-bold text-white hover:bg-ona-tertiary"
        >
          Book a session
        </Link>
      </header>

      <div role="tablist" aria-label="Bookings" className="mb-5 flex gap-[3px] rounded-md border border-border-default bg-surface-sunk p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => switchTab(t)}
            className={`min-h-[var(--tap-min)] flex-1 rounded-sm text-[14px] font-bold capitalize ${
              tab === t ? "bg-surface text-ink shadow-card" : "text-ink-dim hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {notice ? (
        <p role="status" className="mb-4 rounded-md bg-ok-bg px-4 py-3 text-[14px] text-ok">
          {notice}
        </p>
      ) : null}

      {loadFailed ? (
        <div className="rounded-lg border border-border-default bg-surface px-5 py-6 text-center">
          <p className="mb-3 text-ink">Your bookings could not be loaded.</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="min-h-[var(--tap-min)] rounded-md border border-border-default px-5 font-bold text-ink"
          >
            Try again
          </button>
        </div>
      ) : rows === null ? (
        <p className="py-8 text-center text-ink-mute">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-5 py-10 text-center text-ink-mute">
          {tab === "upcoming" ? "No upcoming sessions." : "Nothing here yet."}
        </p>
      ) : (
        <ul className="space-y-3" aria-label={`${tab} bookings`}>
          {rows.map((b) => (
            <BookingRow key={b.id} booking={b} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookingRow({ booking: b, onChanged }: { booking: Booking; onChanged: (m: string) => void }) {
  const [mode, setMode] = useState<"idle" | "cancel" | "move">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hours = Math.round(b.duration_minutes / 60);

  async function run(action: () => Promise<Booking>, message: (r: Booking) => string) {
    setBusy(true);
    setError(null);
    try {
      const r = await action();
      // The list reloads with the same row keys, so this row is NOT
      // remounted — reset its own state or it stays busy with no actions.
      setMode("idle");
      setBusy(false);
      onChanged(message(r));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border-default bg-surface p-4 sm:p-5" data-testid="booking-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 flex flex-wrap items-center gap-2">
            <b className="text-[16px] text-ink">{b.room.name}</b>
            <StatusPill status={b.status} />
          </p>
          <p className="text-[14px] text-ink-dim">
            {fmtDay(b.start_at)} · {fmtTime(b.start_at)}–{fmtTime(b.end_at)} · {hours} {hours === 1 ? "hour" : "hours"}
          </p>
          <p className="text-[13px] text-ink-mute">
            {b.service.name} with {b.engineer.name} · <span className="font-mono">{b.reference}</span>
          </p>
        </div>
        <p className="text-right text-[17px] font-black text-ink">{b.total_display}</p>
      </div>

      {error ? (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      ) : null}

      {b.can_change && mode === "idle" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("move")}
            className="min-h-[var(--tap-min)] rounded-md border border-border-default px-4 text-[14px] font-bold text-ink hover:border-ink-mute"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => setMode("cancel")}
            className="min-h-[var(--tap-min)] rounded-md px-4 text-[14px] font-bold text-err hover:bg-err-bg"
          >
            Cancel booking
          </button>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="mt-3 rounded-md bg-err-bg p-3" role="group" aria-label="Confirm cancellation">
          <p className="mb-2 text-[14px] text-ink">
            Cancel {b.reference}? The slot is released for someone else. No payment has been taken.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => cancelBooking(b.id), (r) => `${r.reference} was cancelled.`)}
              className="min-h-[var(--tap-min)] rounded-md bg-err px-4 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "One moment…" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode("idle")}
              className="min-h-[var(--tap-min)] rounded-md border border-border-default bg-surface px-4 text-[14px] font-bold text-ink"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}

      {mode === "move" ? (
        <div className="mt-4 border-t border-border-soft pt-4">
          <p className="mb-3 text-[14px] font-bold text-ink">
            Pick a new start — same room, engineer and length ({hours} {hours === 1 ? "hour" : "hours"}), same price.
          </p>
          <SlotPicker
            roomId={b.room.id}
            engineerId={b.engineer.id}
            hours={hours}
            ownStart={b.start_at}
            ownEnd={b.end_at}
            disabled={busy}
            onPick={(start) =>
              void run(
                () => rescheduleBooking(b.id, start),
                (r) => `${r.reference} moved to ${fmtDay(r.start_at)} at ${fmtTime(r.start_at)}.`,
              )
            }
          />
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="mt-3 min-h-[var(--tap-min)] rounded-md px-3 text-[14px] font-bold text-ink-dim hover:text-ink"
          >
            Never mind
          </button>
        </div>
      ) : null}
    </li>
  );
}
