"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { FormError } from "@/components/auth/fields";
import { useAuthSubmit } from "@/components/auth/shared";
import {
  createBooking,
  fetchCalendar,
  fetchCatalogueFromBrowser,
  fmtDay,
  fmtShortDay,
  fmtTime,
  previewGhs,
  studioDate,
  type Booking,
  type Slot,
} from "@/lib/api/bookings";
import { formatDuration, type Engineer, type Room, type Service } from "@/lib/api/studio";

/**
 * Booking flow — /customer/book
 *
 * Ports docs/design/pages/booking-flow.html: a stepper, one question per
 * step, and a live summary that is a sticky rail on desktop and sits
 * inline on mobile (ADR-013). Steps:
 *
 *   1 Room  2 Engineer  3 Service  4 Date & time  5 Review
 *
 * The Payment step from the design is Phase 2; today the booking is created
 * as "pending" and the review step says so plainly.
 *
 * Availability comes from the API per room+engineer and the customer picks
 * from slots the API already labelled — the page never reasons about
 * overlap. If two people race for the same hour the API answers 409 and
 * the calendar is reloaded so the taken slot disappears.
 */

const STEPS = ["Room", "Engineer", "Service", "Date & time", "Review"] as const;
const DAYS_AHEAD = 14;
const MAX_HOURS = 4;

type Catalogue = { rooms: Room[]; engineers: Engineer[]; services: Service[] };

export default function BookPage() {
  // useSearchParams() needs a Suspense boundary above it or Next refuses to
  // prerender the route; the fallback is what shows for the first paint.
  return (
    <Suspense fallback={<p className="py-10 text-center text-ink-mute">Loading the studio…</p>}>
      <BookFlow />
    </Suspense>
  );
}

function BookFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { pending, formError, submit } = useAuthSubmit();

  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [room, setRoom] = useState<Room | null>(null);
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<Slot | null>(null);
  const [hoursWanted, setHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<Booking | null>(null);

  /* Catalogue once. A ?room= from the public page preselects. */
  useEffect(() => {
    let live = true;
    fetchCatalogueFromBrowser()
      .then((c) => {
        if (!live) return;
        setCatalogue(c);
        const wanted = params.get("room");
        const pre = wanted ? c.rooms.find((r) => r.id === wanted) : undefined;
        if (pre) {
          setRoom(pre);
          setStep(1);
        }
      })
      .catch(() => live && setLoadError("The studio catalogue could not be loaded."));
    return () => {
      live = false;
    };
  }, [params]);

  /* Calendar whenever room + engineer are both chosen. calendarKey bumps
     to force a reload after a failed submit (the slot may have been taken). */
  const [calendarKey, setCalendarKey] = useState(0);
  useEffect(() => {
    if (!room || !engineer) return;
    let live = true;
    const from = new Date();
    const to = new Date(from.getTime() + (DAYS_AHEAD - 1) * 86_400_000);
    fetchCalendar({ room: room.id, engineer: engineer.id, from: studioDate(from), to: studioDate(to) })
      .then((cal) => live && setSlots(cal.slots))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [room, engineer, calendarKey]);

  // Changing room or engineer invalidates the slots; done here, in the
  // event, rather than by a setState inside the effect above.
  function pickRoom(r: Room) {
    setRoom(r);
    setSlots(null);
    setStart(null);
    setStep(1);
  }
  function pickEngineer(e: Engineer) {
    setEngineer(e);
    setSlots(null);
    setStart(null);
    setStep(2);
  }

  /* Derived */
  const byDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const k = studioDate(new Date(s.start_at));
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots]);

  const daySlots = day ? (byDay.get(day) ?? []) : [];

  // How many consecutive hours are free from the chosen start. Bounds the
  // hours stepper so the customer cannot pick a length the API will refuse.
  const maxHours = useMemo(() => {
    if (!start) return 1;
    const i = daySlots.findIndex((s) => s.start_at === start.start_at);
    let n = 0;
    for (let j = i; j < daySlots.length && daySlots[j].state === "available"; j++) n++;
    return Math.max(1, Math.min(MAX_HOURS, n));
  }, [start, daySlots]);

  // The stepper stores the customer's wish; the value used everywhere is
  // clamped to what is actually free from the chosen start.
  const hours = Math.min(hoursWanted, maxHours);

  const endIso = start ? new Date(new Date(start.start_at).getTime() + hours * 3_600_000).toISOString() : null;
  const totalPesewas = room ? room.hourly_rate_pesewas * hours : 0;

  const canNext = [!!room, !!engineer, !!service, !!start, true][step];

  async function confirm() {
    if (!room || !engineer || !service || !start) return;
    await submit(async () => {
      try {
        const booking = await createBooking({
          room: room.id,
          engineer: engineer.id,
          service: service.id,
          start_at: start.start_at,
          hours,
          notes: notes.trim() || undefined,
        });
        setDone(booking);
      } catch (err) {
        // Whatever the reason, the calendar may have changed under us.
        setSlots(null);
        setCalendarKey((k) => k + 1);
        setStep(3);
        throw err;
      }
    });
  }

  if (done) return <Confirmed booking={done} onAnother={() => router.refresh()} />;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-6">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
          Book a session
        </p>
        <h1 className="text-[clamp(26px,4vw,38px)] font-black leading-[1.08] tracking-tight text-ink">
          Your session, your way
        </h1>
      </header>

      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      {loadError ? <FormError message={loadError} /> : null}
      {formError ? <FormError message={formError} /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section aria-live="polite" className="min-w-0">
          {!catalogue ? (
            <p className="py-10 text-center text-ink-mute">Loading the studio…</p>
          ) : step === 0 ? (
            <Choose
              title="Choose your studio"
              lede="Every room comes with an engineer. Rate is per hour."
              items={catalogue.rooms}
              selected={room?.id}
              onPick={pickRoom}
              render={(r) => (
                <>
                  <b className="block text-[17px] font-black text-ink">{r.name}</b>
                  <span className="block text-[15px] font-bold text-ink">
                    {r.hourly_rate_display} <span className="font-normal text-ink-mute">/ hour</span>
                  </span>
                  {r.description ? <span className="mt-1 block text-[13.5px] text-ink-dim">{r.description}</span> : null}
                </>
              )}
            />
          ) : step === 1 ? (
            <Choose
              title="Pick an engineer"
              lede="Who runs your session. Availability is checked for both room and engineer."
              items={catalogue.engineers}
              selected={engineer?.id}
              onPick={pickEngineer}
              render={(e) => (
                <>
                  <b className="block text-[17px] font-black text-ink">{e.name}</b>
                  {e.specialties.length ? (
                    <span className="mt-1 block text-[13.5px] text-ink-dim">{e.specialties.join(" · ")}</span>
                  ) : null}
                </>
              )}
            />
          ) : step === 2 ? (
            <Choose
              title="What is the session for?"
              lede="This tells the engineer what to prepare. Your price is the room rate."
              items={catalogue.services}
              selected={service?.id}
              onPick={(s) => {
                setService(s);
                setStep(3);
              }}
              render={(s) => (
                <>
                  <b className="block text-[17px] font-black text-ink">{s.name}</b>
                  <span className="block text-[13.5px] text-ink-dim">
                    Typically {formatDuration(s.duration_minutes)}
                  </span>
                </>
              )}
            />
          ) : step === 3 ? (
            <DateTime
              byDay={byDay}
              loading={slots === null}
              day={day}
              onDay={(d) => {
                setDay(d);
                setStart(null);
              }}
              daySlots={daySlots}
              start={start}
              onStart={setStart}
              hours={hours}
              maxHours={maxHours}
              onHours={setHours}
            />
          ) : (
            <Review notes={notes} onNotes={setNotes} />
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex min-h-[var(--tap-min)] items-center rounded-md border border-border-default px-5 font-bold text-ink transition-colors hover:border-ink-mute"
              >
                Back
              </button>
            ) : null}
            {step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={pending || !start}
                aria-busy={pending}
                onClick={() => void confirm()}
                className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary disabled:opacity-60"
              >
                {pending ? "One moment…" : "Confirm booking"}
              </button>
            )}
          </div>
        </section>

        <Summary
          room={room}
          engineer={engineer}
          service={service}
          start={start}
          endIso={endIso}
          hours={hours}
          total={previewGhs(totalPesewas)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="mb-6 flex gap-1.5 overflow-x-auto" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={state === "todo"}
              aria-current={state === "current" ? "step" : undefined}
              onClick={() => onJump(i)}
              className={`w-full rounded-md border px-2 py-2 text-left text-[12px] font-bold leading-tight transition-colors ${
                state === "current"
                  ? "border-ona-red bg-surface text-ink"
                  : state === "done"
                    ? "border-ok/30 bg-ok-bg text-ok"
                    : "border-border-soft bg-surface-sunk text-ink-mute"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-70">Step {i + 1}</span>
              <span className="block truncate">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Choose<T extends { id: string }>({
  title,
  lede,
  items,
  selected,
  onPick,
  render,
}: {
  title: string;
  lede: string;
  items: T[];
  selected?: string;
  onPick: (item: T) => void;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-[clamp(20px,3vw,26px)] font-black tracking-tight text-ink">{title}</legend>
      <p className="mb-5 text-[14.5px] text-ink-dim">{lede}</p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-5 py-8 text-center text-ink-mute">
          Nothing is available to book right now.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => onPick(item)}
                className={`w-full rounded-xl border p-4 text-left transition-shadow ${
                  selected === item.id
                    ? "border-ona-red shadow-[0_0_0_3px_rgba(201,0,7,0.1)]"
                    : "border-border-default bg-surface hover:border-ink-mute"
                }`}
              >
                {render(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function DateTime({
  byDay,
  loading,
  day,
  onDay,
  daySlots,
  start,
  onStart,
  hours,
  maxHours,
  onHours,
}: {
  byDay: Map<string, Slot[]>;
  loading: boolean;
  day: string | null;
  onDay: (d: string) => void;
  daySlots: Slot[];
  start: Slot | null;
  onStart: (s: Slot) => void;
  hours: number;
  maxHours: number;
  onHours: (h: number) => void;
}) {
  const days = [...byDay.entries()];
  return (
    <div>
      <h2 className="mb-1 text-[clamp(20px,3vw,26px)] font-black tracking-tight text-ink">Pick a date &amp; time</h2>
      <p className="mb-5 text-[14.5px] text-ink-dim">Studio hours are 09:00 to 21:00. Sessions start on the hour.</p>

      {loading ? (
        <p className="py-6 text-ink-mute">Checking availability…</p>
      ) : (
        <>
          <ul className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Days">
            {days.map(([k, ss]) => {
              const free = ss.filter((s) => s.state === "available").length;
              const closed = ss.every((s) => s.state === "holiday");
              return (
                <li key={k} className="flex-none">
                  <button
                    type="button"
                    disabled={free === 0}
                    aria-pressed={day === k}
                    aria-label={`${fmtShortDay(ss[0].start_at)}, ${closed ? "studio closed" : free === 0 ? "fully booked" : `${free} slots available`}`}
                    onClick={() => onDay(k)}
                    className={`min-w-[88px] rounded-md border px-3 py-2 text-center text-[13px] font-bold transition-colors disabled:opacity-40 ${
                      day === k ? "border-ona-red bg-surface text-ink" : "border-border-default bg-surface text-ink-dim hover:border-ink-mute"
                    }`}
                  >
                    <span className="block">{fmtShortDay(ss[0].start_at)}</span>
                    <span className="block text-[11px] font-normal text-ink-mute">
                      {closed ? "Closed" : free === 0 ? "Full" : `${free} free`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {day ? (
            <fieldset className="mb-6">
              <legend className="mb-3 text-[14px] font-bold text-ink">
                Start times on {fmtDay(daySlots[0].start_at)}
              </legend>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-label="Start times">
                {daySlots.map((s) => {
                  const free = s.state === "available";
                  return (
                    <li key={s.start_at}>
                      <button
                        type="button"
                        disabled={!free}
                        aria-pressed={start?.start_at === s.start_at}
                        onClick={() => onStart(s)}
                        className={`w-full rounded-md border px-2 py-2.5 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          start?.start_at === s.start_at
                            ? "border-ona-red bg-surface text-ink"
                            : "border-border-default bg-surface text-ink hover:border-ink-mute"
                        }`}
                      >
                        {fmtTime(s.start_at)}
                        {!free ? (
                          <span className="block text-[10px] font-normal capitalize text-ink-mute">{s.state}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}

          {start ? (
            <div>
              <p id="dur-h" className="mb-2 text-[14px] font-bold text-ink">
                How long do you need?
              </p>
              <div className="inline-flex items-center rounded-md border border-border-default" role="group" aria-labelledby="dur-h">
                <button
                  type="button"
                  aria-label="Decrease by 1 hour"
                  disabled={hours <= 1}
                  onClick={() => onHours(hours - 1)}
                  className="min-h-[var(--tap-min)] px-4 text-lg font-black text-ink disabled:opacity-30"
                >
                  −
                </button>
                <span className="min-w-[88px] text-center text-[15px] font-bold text-ink" aria-live="polite">
                  {hours} {hours === 1 ? "hour" : "hours"}
                </span>
                <button
                  type="button"
                  aria-label="Increase by 1 hour"
                  disabled={hours >= maxHours}
                  onClick={() => onHours(hours + 1)}
                  className="min-h-[var(--tap-min)] px-4 text-lg font-black text-ink disabled:opacity-30"
                >
                  +
                </button>
              </div>
              {maxHours < MAX_HOURS ? (
                <p className="mt-2 text-[12.5px] text-ink-mute">
                  Up to {maxHours} {maxHours === 1 ? "hour" : "hours"} from this start before the next booking or closing.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Review({ notes, onNotes }: { notes: string; onNotes: (v: string) => void }) {
  return (
    <div>
      <h2 className="mb-1 text-[clamp(20px,3vw,26px)] font-black tracking-tight text-ink">Review and confirm</h2>
      <p className="mb-5 text-[14.5px] text-ink-dim">
        No payment is taken yet. Your booking is held as pending and ONA will confirm it with you.
      </p>
      <label htmlFor="notes" className="mb-1.5 block text-[13.5px] font-bold text-ink">
        Anything the engineer should know? <span className="font-normal text-ink-mute">(optional)</span>
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={4}
        maxLength={1000}
        value={notes}
        onChange={(e) => onNotes(e.target.value)}
        className="w-full rounded-md border border-border-default bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-ink-mute"
        placeholder="Instruments, number of people, references…"
      />
    </div>
  );
}

function Summary({
  room,
  engineer,
  service,
  start,
  endIso,
  hours,
  total,
}: {
  room: Room | null;
  engineer: Engineer | null;
  service: Service | null;
  start: Slot | null;
  endIso: string | null;
  hours: number;
  total: string;
}) {
  return (
    <aside aria-label="Session summary" className="rounded-xl border border-border-default bg-surface p-5 lg:sticky lg:top-6">
      <h2 className="mb-1 text-[17px] font-black tracking-tight text-ink">{service?.name ?? "Your session"}</h2>
      <p className="mb-4 text-[13.5px] text-ink-dim">
        {room?.name ?? "Choose a room"}
        {start ? ` · ${fmtDay(start.start_at)}` : ""}
      </p>
      <dl>
        <Row k="Engineer" v={engineer?.name ?? "—"} />
        <Row k="Start" v={start ? fmtTime(start.start_at) : "—"} />
        <Row k="Length" v={start ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "—"} />
        <Row k="Ends" v={endIso ? fmtTime(endIso) : "—"} />
        <Row k="Rate" v={room ? `${room.hourly_rate_display} / hr` : "—"} />
      </dl>
      <p className="mt-4 flex items-baseline justify-between">
        <span className="text-[13.5px] font-bold text-ink-dim">Total</span>
        <b className="text-[24px] font-black text-ink" data-testid="summary-total">{room ? total : "—"}</b>
      </p>
      <p className="mt-4 rounded-md bg-surface-sunk px-3 py-2.5 text-[12.5px] leading-snug text-ink-dim">
        <b className="block text-ink">No payment yet</b>
        Online payment arrives with the next release. Nothing is charged today.
      </p>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-soft py-2 text-[13.5px]">
      <dt className="text-ink-dim">{k}</dt>
      <dd className="text-right font-bold text-ink">{v}</dd>
    </div>
  );
}

function Confirmed({ booking, onAnother }: { booking: Booking; onAnother: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-6 text-center">
      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ok">Booking received</p>
      <h1 className="mb-3 text-[clamp(26px,4vw,38px)] font-black leading-[1.08] tracking-tight text-ink">
        Your reference is <span className="font-mono" data-testid="booking-reference">{booking.reference}</span>
      </h1>
      <p className="mb-6 text-[16px] leading-relaxed text-ink-dim">
        {booking.room.name} with {booking.engineer.name}, {fmtDay(booking.start_at)} from {fmtTime(booking.start_at)}{" "}
        to {fmtTime(booking.end_at)}. Total {booking.total_display}. It is held as pending — ONA will confirm it with
        you, and no payment has been taken.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/customer"
          className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary"
        >
          Back to your workspace
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="flex min-h-[var(--tap-min)] items-center rounded-md border border-border-default px-6 font-bold text-ink transition-colors hover:border-ink-mute"
        >
          Book another
        </button>
      </div>
    </div>
  );
}
