"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusPill } from "@/components/booking/status-pill";
import { fetchBookingSummary, fmtDay, fmtShortDay, fmtTime, type BookingSummary } from "@/lib/api/bookings";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Customer overview — /customer
 *
 * Ports the studio half of docs/design/pages/dashboard-customer.html: a
 * greeting, the stats row, and the next session. The template's projects,
 * activity feed and escrow panel belong to the marketplace (ADR-015) and the
 * payments phase, and arrive with them.
 */

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", hour: "numeric", hour12: false }).format(new Date()),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function CustomerHome() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchBookingSummary()
      .then((s) => live && setSummary(s))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const next = summary?.next ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="mb-1 text-[clamp(26px,4vw,34px)] font-black tracking-tight text-ink">
        {greeting()}
        {user?.first_name ? `, ${user.first_name}` : ""}
      </h1>
      <p className="mb-6 text-[15px] text-ink-dim">Your studio sessions at a glance.</p>

      {failed ? (
        <p className="mb-6 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          Your numbers could not be loaded just now. Your bookings are safe —{" "}
          <Link href="/customer/bookings" className="font-bold underline">
            see the full list
          </Link>
          .
        </p>
      ) : null}

      <ul className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Summary">
        <Stat
          label="Upcoming sessions"
          value={summary?.upcoming_count}
          hint={next ? `Next on ${fmtShortDay(next.start_at)}` : "Nothing booked yet"}
          brand
        />
        <Stat
          label="Awaiting confirmation"
          value={summary?.pending_count}
          hint={summary?.pending_count ? "ONA will confirm these with you" : "All confirmed"}
        />
        <Stat label="Hours booked ahead" value={summary?.upcoming_hours} hint="Across upcoming sessions" />
      </ul>

      <section aria-labelledby="next-h" className="rounded-xl border border-border-default bg-surface p-5 sm:p-6">
        <h2 id="next-h" className="mb-4 text-[17px] font-black tracking-tight text-ink">
          Next session
        </h2>
        {summary === null && !failed ? (
          <p className="text-ink-mute">Loading…</p>
        ) : next ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 flex flex-wrap items-center gap-2">
                <b className="text-[18px] text-ink">{next.service.name}</b>
                <StatusPill status={next.status} />
              </p>
              <p className="text-[15px] text-ink-dim">
                {fmtDay(next.start_at)}, {fmtTime(next.start_at)}–{fmtTime(next.end_at)}
              </p>
              <p className="text-[14px] text-ink-mute">
                {next.room.name} with {next.engineer.name} · <span className="font-mono">{next.reference}</span>
              </p>
            </div>
            <Link
              href="/customer/bookings"
              className="flex min-h-[var(--tap-min)] items-center rounded-md border border-border-default px-5 font-bold text-ink hover:border-ink-mute"
            >
              Manage bookings
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[15px] text-ink-dim">No session booked. Rooms come with an engineer.</p>
            <Link
              href="/customer/book"
              className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-5 font-bold text-white hover:bg-ona-tertiary"
            >
              Book a session
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, brand }: { label: string; value?: number; hint: string; brand?: boolean }) {
  return (
    <li
      className={`rounded-xl border p-4 ${brand ? "border-transparent bg-ona-gradient text-white" : "border-border-default bg-surface"}`}
    >
      <p className={`text-[12.5px] font-bold ${brand ? "text-white/85" : "text-ink-dim"}`}>{label}</p>
      <p className={`my-1 text-[30px] font-black leading-none ${brand ? "text-white" : "text-ink"}`} data-testid={`stat-${label}`}>
        {value ?? "—"}
      </p>
      <p className={`text-[12.5px] ${brand ? "text-white/80" : "text-ink-mute"}`}>{hint}</p>
    </li>
  );
}
