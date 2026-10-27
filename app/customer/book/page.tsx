"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarX2,
  Check,
  CheckCircle2,
  DoorOpen,
  Headphones,
  Minus,
  Music,
  Plus,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { FormError } from "@/components/auth/fields";
import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState } from "@/components/dashboard/states";
import { PayButton } from "@/components/booking/pay-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/errors";
import {
  createBooking,
  fetchCalendar,
  fetchCatalogueFromBrowser,
  fmtDay,
  fmtShortDay,
  fmtTime,
  groupSlotsByDay,
  previewGhs,
  studioDate,
  type Booking,
  type Slot,
} from "@/lib/api/bookings";
import { formatDuration, type Engineer, type Room, type Service } from "@/lib/api/studio";
import { clearDraft, loadDraft, saveDraft } from "@/lib/booking-draft";
import { cn } from "@/lib/utils";

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
 * overlap. If two people race for the same hour the API answers 409; the
 * calendar reloads so the taken slot shows as booked.
 *
 * A session that expires while confirming no longer loses the booking:
 * the choices are kept for this tab (lib/booking-draft.ts) and offered again,
 * re-checked against the calendar, once the customer has signed back in.
 *
 * Fixed after the 2026-10-13 review: a failed submit or an empty calendar
 * crashed the page (stale `start`/`day` against empty slots); re-picking the
 * same room left "Checking availability…" forever; "Book another" did
 * nothing; validation errors from the API showed a generic message; focus
 * fell to <body> between steps.
 */

const STEPS = ["Room", "Engineer", "Service", "Date & time", "Review"] as const;
const DAYS_AHEAD = 14;
const MAX_HOURS = 4;

type Catalogue = { rooms: Room[]; engineers: Engineer[]; services: Service[] };

export default function BookPage() {
  // A key remount is the whole of "Book another": every piece of flow state
  // starts fresh, with nothing to forget to reset.
  const [run, setRun] = useState(0);
  // useSearchParams() needs a Suspense boundary above it or Next refuses to
  // prerender the route; the fallback is what shows for the first paint.
  return (
    <Suspense fallback={<p className="py-10 text-center text-ink-mute">Loading the studio…</p>}>
      <BookFlow key={run} onAnother={() => setRun((r) => r + 1)} />
    </Suspense>
  );
}

/** The sentence to show for a failed booking. Field errors carry the useful
 *  text ("That room is already booked…"); ApiError.formError alone would
 *  replace them with a generic message. */
function messageFrom(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = err.fieldErrors;
    for (const key of ["start_at", "hours", "room", "engineer", "service", "notes"]) {
      if (fields[key]?.length) return fields[key][0];
    }
    return err.formError;
  }
  return "Something went wrong. Please try again.";
}

function BookFlow({ onAnother }: { onAnother: () => void }) {
  const params = useSearchParams();

  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [room, setRoom] = useState<Room | null>(null);
  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [calendarFailed, setCalendarFailed] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState<Slot | null>(null);
  const [hoursWanted, setHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);
  // A start time from a kept draft, waiting for the calendar to confirm it.
  const resumeStart = useRef<string | null>(null);
  // Booking needs a confirmed email when the API says so (Task 18).
  const mustVerify = useAuthStore((s) => Boolean(s.user?.must_verify_email));
  const [resumed, setResumed] = useState(false);

  const stepRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  /* Catalogue once. A ?room= from the public page preselects. */
  useEffect(() => {
    let live = true;
    fetchCatalogueFromBrowser()
      .then((c) => {
        if (!live) return;
        setCatalogue(c);
        // A booking interrupted by an expired session comes back first.
        const draft = loadDraft();
        const dr = draft && c.rooms.find((r) => r.id === draft.room);
        const de = draft && c.engineers.find((e) => e.id === draft.engineer);
        const ds = draft && c.services.find((s) => s.id === draft.service);
        if (draft && dr && de && ds) {
          setRoom(dr);
          setEngineer(de);
          setService(ds);
          setHours(draft.hours);
          setNotes(draft.notes);
          resumeStart.current = draft.start_at;
          setStep(3);
          return;
        }
        clearDraft();
        const wanted = params.get("room");
        const pre = wanted ? c.rooms.find((r) => r.id === wanted) : undefined;
        if (pre) {
          setRoom(pre);
          setStep(1);
        }
      })
      .catch(() => live && setLoadError("The studio catalogue could not be loaded. Please refresh."));
    return () => {
      live = false;
    };
  }, [params]);

  /* Calendar whenever room + engineer are both chosen. calendarKey bumps to
     force a reload (after a failed submit, or the customer pressing retry). */
  useEffect(() => {
    if (!room || !engineer) return;
    let live = true;
    const from = new Date();
    const to = new Date(from.getTime() + (DAYS_AHEAD - 1) * 86_400_000);
    fetchCalendar({ room: room.id, engineer: engineer.id, from: studioDate(from), to: studioDate(to) })
      .then((cal) => {
        if (!live) return;
        setSlots(cal.slots);
        setCalendarFailed(false);
        // Resuming a kept draft: offer the same time only if it is still free.
        const wanted = resumeStart.current;
        if (wanted) {
          resumeStart.current = null;
          clearDraft();
          const slot = cal.slots.find((sl) => sl.start_at === wanted && sl.state === "available");
          if (slot) {
            setDay(studioDate(new Date(slot.start_at)));
            setStart(slot);
            setResumed(true);
            setStep(4);
          } else {
            setSubmitError("The time you picked is no longer free. Please choose another.");
          }
        }
      })
      .catch(() => {
        if (!live) return;
        setSlots([]);
        setCalendarFailed(true);
      });
    return () => {
      live = false;
    };
  }, [room, engineer, calendarKey]);

  /* Move focus to the new step's heading so keyboard and screen-reader users
     are not dropped at <body> when the card they pressed unmounts. */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stepRef.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [step]);

  useEffect(() => {
    if (submitError) errorRef.current?.focus();
  }, [submitError]);

  /* Choosing a different room or engineer invalidates the slots. Choosing
     the SAME one again (Back, then the already-selected card) must just move
     on — resetting would wait on an effect whose inputs did not change. */
  function resetTime() {
    setSlots(null);
    setCalendarFailed(false);
    setDay(null);
    setStart(null);
  }
  function pickRoom(r: Room) {
    if (r.id !== room?.id) {
      setRoom(r);
      resetTime();
    }
    setStep(1);
  }
  function pickEngineer(e: Engineer) {
    if (e.id !== engineer?.id) {
      setEngineer(e);
      resetTime();
    }
    setStep(2);
  }
  function retryCalendar() {
    setSlots(null);
    setCalendarFailed(false);
    setCalendarKey((k) => k + 1);
  }

  /* Derived */
  const byDay = useMemo(() => groupSlotsByDay(slots ?? []), [slots]);

  const daySlots = useMemo(() => (day ? (byDay.get(day) ?? []) : []), [day, byDay]);

  // Consecutive free hours from the chosen start. Bounds the hours stepper so
  // the customer cannot pick a length the API will refuse.
  const maxHours = useMemo(() => {
    if (!start) return 1;
    const i = daySlots.findIndex((s) => s.start_at === start.start_at);
    if (i < 0) return 1;
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
    if (!room || !engineer || !service || !start || pending) return;
    setPending(true);
    setSubmitError(null);
    setResumed(false);
    // Kept only if this attempt fails because the session ran out.
    saveDraft({ room: room.id, engineer: engineer.id, service: service.id, start_at: start.start_at, hours, notes });
    try {
      const booking = await createBooking({
        room: room.id,
        engineer: engineer.id,
        service: service.id,
        start_at: start.start_at,
        hours,
        notes: notes.trim() || undefined,
      });
      clearDraft();
      setDone(booking);
    } catch (err) {
      // Signed out mid-confirm: keep the draft — the guard is already
      // sending the customer to sign in, and they will come back to it.
      if (err instanceof ApiError && err.isAuthError) return;
      clearDraft();
      // Whatever the reason, the calendar may have changed under us: drop
      // the chosen time, reload, and go back to the time step.
      setSubmitError(messageFrom(err));
      setStart(null);
      retryCalendar();
      setStep(3);
      setPending(false);
    }
  }

  if (done) return <Confirmed booking={done} onAnother={onAnother} />;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Your session, your way"
        description="Pick a room, an engineer and a time. Rooms come with the engineer; times are Accra time."
      />

      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {loadError ? <FormError message={loadError} /> : null}
      <VerifyEmailBanner />
      {resumed ? (
        <p role="status" className="mb-4 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-info">
          Welcome back — we kept your booking while you signed in again. Check it and confirm.
        </p>
      ) : null}
      <div ref={errorRef} tabIndex={-1} className="outline-none">
        <FormError message={submitError} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section className="min-w-0" ref={stepRef}>
          <Card>
            <CardContent className="pt-1">
              {!catalogue ? (
                <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading the studio">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : step === 0 ? (
                <Choose
                  icon={DoorOpen}
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
                  icon={Headphones}
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
                  icon={Music}
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
                      <span className="block text-[13.5px] text-ink-dim">Typically {formatDuration(s.duration_minutes)}</span>
                    </>
                  )}
                />
              ) : step === 3 ? (
                <DateTime
                  byDay={byDay}
                  loading={slots === null}
                  failed={calendarFailed}
                  onRetry={retryCalendar}
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

              <div className="mt-6 flex flex-wrap gap-3 border-t border-border-soft pt-5">
                {step > 0 ? (
                  <Button type="button" variant="outline" className="h-11 px-5 font-bold" onClick={() => setStep(step - 1)}>
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </Button>
                ) : null}
                {step < 4 ? (
                  <Button type="button" className="h-11 px-6 font-bold" disabled={!canNext} onClick={() => setStep(step + 1)}>
                    Continue
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-11 px-6 font-bold"
                    disabled={pending || !start || mustVerify}
                    aria-busy={pending}
                    title={mustVerify ? "Confirm your email first" : undefined}
                    onClick={() => void confirm()}
                  >
                    <CalendarCheck2 aria-hidden="true" />
                    {pending ? "One moment…" : "Confirm booking"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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

function StepHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      data-step-heading
      tabIndex={-1}
      className="mb-1 mt-4 text-[clamp(20px,3vw,24px)] font-black tracking-tight text-ink outline-none"
    >
      {children}
    </h2>
  );
}

/** Numbered steps joined by a line; done steps are tappable to go back. */
function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="mb-6 flex items-center" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={state === "todo"}
              aria-current={state === "current" ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${label}${state === "done" ? " (done)" : ""}`}
              onClick={() => onJump(i)}
              className="flex min-h-[var(--tap-min)] items-center gap-2 rounded-lg pr-2 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "grid size-8 flex-none place-items-center rounded-pill text-[13px] font-black transition-colors",
                  state === "current" && "bg-ona-red text-white ring-4 ring-ona-red/15",
                  state === "done" && "bg-ok text-white",
                  state === "todo" && "bg-surface-sunk text-ink-mute",
                )}
              >
                {state === "done" ? <Check aria-hidden="true" className="size-4" /> : i + 1}
              </span>
              {/* Labels from md up; at 390px the circles carry it, the
                  aria-label says it in full. */}
              <span
                className={cn(
                  "hidden truncate text-[13px] font-bold lg:block",
                  state === "current" ? "text-ink" : state === "done" ? "text-ink-dim" : "text-ink-mute",
                )}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 ? (
              <span aria-hidden="true" className={cn("mx-1 h-0.5 flex-1 rounded-pill", i < step ? "bg-ok" : "bg-border-default")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Choose<T extends { id: string }>({
  icon: Icon,
  title,
  lede,
  items,
  selected,
  onPick,
  render,
}: {
  icon: LucideIcon;
  title: string;
  lede: string;
  items: T[];
  selected?: string;
  onPick: (item: T) => void;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <div role="group" aria-labelledby="choose-h">
      <StepHeading id="choose-h">{title}</StepHeading>
      <p className="mb-5 text-[14.5px] text-ink-dim">{lede}</p>
      {items.length === 0 ? (
        <EmptyState icon={Icon} title="Nothing to book right now" body="Please check back soon, or call ONA." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const on = selected === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(item)}
                  className={cn(
                    "relative flex w-full gap-3 rounded-xl border p-4 text-left transition-all",
                    on
                      ? "border-ona-red bg-surface ring-4 ring-ona-red/10"
                      : "border-border-default bg-surface hover:border-ink-mute hover:shadow-card",
                  )}
                >
                  <span aria-hidden="true" className={cn("grid size-10 flex-none place-items-center rounded-lg", on ? "bg-ona-red text-white" : "bg-surface-alt text-ona-blue")}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">{render(item)}</span>
                  {on ? <CheckCircle2 aria-hidden="true" className="absolute top-3 right-3 size-5 text-ona-red" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DateTime({
  byDay,
  loading,
  failed,
  onRetry,
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
  failed: boolean;
  onRetry: () => void;
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
      <StepHeading>Pick a date &amp; time</StepHeading>
      <p className="mb-5 text-[14.5px] text-ink-dim">Studio hours are 09:00 to 21:00, Accra time. Sessions start on the hour.</p>

      {loading ? (
        <div aria-busy="true" aria-label="Checking availability" className="space-y-3">
          <p className="text-[14px] text-ink-mute">Checking availability…</p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-[88px] rounded-lg" />
            ))}
          </div>
        </div>
      ) : failed ? (
        <ErrorState message="Availability could not be loaded." onRetry={onRetry} />
      ) : days.length === 0 ? (
        <EmptyState icon={CalendarX2} title="No open times in the next two weeks" body="Try another engineer — availability is checked for both." />
      ) : (
        <>
          <ul className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Days">
            {days.map(([k, ss]) => {
              const free = ss.filter((s) => s.state === "available").length;
              const closed = ss.every((s) => s.state === "holiday");
              const reason = closed ? "Closed" : free === 0 ? "Full" : `${free} free`;
              const on = day === k;
              return (
                <li key={k} className="flex-none">
                  <button
                    type="button"
                    disabled={free === 0}
                    aria-pressed={on}
                    aria-label={`${fmtShortDay(ss[0].start_at)}, ${closed ? "studio closed" : free === 0 ? "fully booked" : `${free} slots available`}`}
                    onClick={() => onDay(k)}
                    className={cn(
                      "min-h-[var(--tap-min)] min-w-[92px] rounded-lg border px-3 py-2 text-center text-[13px] font-bold transition-all",
                      "disabled:cursor-not-allowed disabled:border-border-soft disabled:bg-surface-sunk disabled:text-ink-mute",
                      on ? "border-ona-red bg-ona-red text-white" : "border-border-default bg-surface text-ink hover:border-ink-mute",
                    )}
                  >
                    <span className="block">{fmtShortDay(ss[0].start_at)}</span>
                    <span className={cn("block text-[11px] font-normal", on ? "text-white/85" : "text-ink-mute")}>{reason}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {day && daySlots.length > 0 ? (
            <fieldset className="mb-6">
              <legend className="mb-3 text-[14px] font-bold text-ink">Start times on {fmtDay(daySlots[0].start_at)}</legend>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" aria-label="Start times">
                {daySlots.map((s) => {
                  const free = s.state === "available";
                  const on = start?.start_at === s.start_at;
                  return (
                    <li key={s.start_at}>
                      <button
                        type="button"
                        disabled={!free}
                        aria-pressed={on}
                        onClick={() => onStart(s)}
                        className={cn(
                          "min-h-[var(--tap-min)] w-full rounded-lg border px-2 py-2 text-[14px] font-bold tabular-nums transition-all",
                          "disabled:cursor-not-allowed disabled:border-border-soft disabled:bg-surface-sunk disabled:text-ink-mute",
                          on ? "border-ona-red bg-ona-red text-white" : "border-border-default bg-surface text-ink hover:border-ink-mute",
                        )}
                      >
                        {fmtTime(s.start_at)}
                        {!free ? <span className="block text-[10px] font-normal capitalize">{s.state}</span> : null}
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
              <div className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface p-1" role="group" aria-labelledby="dur-h">
                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Decrease by 1 hour" disabled={hours <= 1} onClick={() => onHours(hours - 1)}>
                  <Minus aria-hidden="true" />
                </Button>
                <span className="min-w-[88px] text-center text-[15px] font-bold text-ink tabular-nums" aria-live="polite">
                  {hours} {hours === 1 ? "hour" : "hours"}
                </span>
                <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Increase by 1 hour" disabled={hours >= maxHours} onClick={() => onHours(hours + 1)}>
                  <Plus aria-hidden="true" />
                </Button>
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
      <StepHeading>Review and confirm</StepHeading>
      <p className="mb-5 text-[14.5px] text-ink-dim">
        No payment is taken yet. Your booking is held as pending and ONA will confirm it with you.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">
          Anything the engineer should know? <span className="font-normal text-ink-mute">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={1000}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Instruments, number of people, references…"
        />
      </div>
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
    <aside aria-label="Session summary" className="lg:sticky lg:top-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-[17px] font-black">{service?.name ?? "Your session"}</CardTitle>
          <p className="text-[13.5px] text-ink-dim">
            {room?.name ?? "Choose a room"}
            {start ? ` · ${fmtDay(start.start_at)}` : ""}
          </p>
        </CardHeader>
        <CardContent>
          <dl>
            <Row k="Engineer" v={engineer?.name ?? "—"} />
            <Row k="Start" v={start ? fmtTime(start.start_at) : "—"} />
            <Row k="Length" v={start ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "—"} />
            <Row k="Ends" v={endIso ? fmtTime(endIso) : "—"} />
            <Row k="Rate" v={room ? `${room.hourly_rate_display} / hr` : "—"} />
          </dl>
          <p className="mt-4 flex items-baseline justify-between">
            <span className="text-[13.5px] font-bold text-ink-dim">Total</span>
            <b className="text-[26px] font-black tabular-nums text-ink" data-testid="summary-total">{room ? total : "—"}</b>
          </p>
          <p className="mt-4 flex gap-2.5 rounded-lg bg-surface-alt px-3 py-2.5 text-[12.5px] leading-snug text-ink-dim">
            <ShieldCheck aria-hidden="true" className="mt-px size-4 flex-none text-ona-blue" />
            <span>
              <b className="block text-ink">No payment yet</b>
              Online payment arrives with the next release. Nothing is charged today.
            </span>
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-soft py-2 text-[13.5px] last:border-b-0">
      <dt className="text-ink-dim">{k}</dt>
      <dd className="text-right font-bold text-ink">{v}</dd>
    </div>
  );
}

function Confirmed({ booking, onAnother }: { booking: Booking; onAnother: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className="mx-auto max-w-xl py-6">
      <Card className="text-center">
        <CardContent className="py-8">
          <span aria-hidden="true" className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-ok-bg text-ok">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-ok">Booking received</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mb-3 text-[clamp(24px,4vw,34px)] font-black leading-[1.1] tracking-tight text-ink outline-none"
          >
            Your reference is <span className="font-mono" data-testid="booking-reference">{booking.reference}</span>
          </h1>
          <p className="mb-6 text-[15.5px] leading-relaxed text-ink-dim">
            {booking.room.name} with {booking.engineer.name}, {fmtDay(booking.start_at)} from {fmtTime(booking.start_at)} to{" "}
            {fmtTime(booking.end_at)}. Total {booking.total_display}.{" "}
            {booking.can_pay_online
              ? "The slot is held for you — pay now to confirm it."
              : "It is held as pending — ONA will confirm it with you, and no payment has been taken."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <PayButton booking={booking} />
            <Button asChild variant={booking.can_pay_online ? "outline" : "default"} className="h-11 px-6 font-bold">
              <Link href="/customer">{booking.can_pay_online ? "Pay later" : "Back to your workspace"}</Link>
            </Button>
            <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={onAnother}>
              Book another
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
