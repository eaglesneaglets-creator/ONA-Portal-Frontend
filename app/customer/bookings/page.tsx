"use client";

import { CalendarClock, CalendarPlus, FileText, MoreHorizontal, Receipt, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/auth/fields";
import { PayButton } from "@/components/booking/pay-button";
import { SlotPicker } from "@/components/booking/slot-picker";
import { StatusPill } from "@/components/booking/status-pill";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { ApiError } from "@/lib/api/errors";
import {
  cancelBooking,
  downloadDocument,
  fmtDay,
  fmtShortDay,
  fmtTime,
  listBookings,
  rescheduleBooking,
  type Booking,
} from "@/lib/api/bookings";

/**
 * /customer/bookings — every booking, with cancel and reschedule.
 *
 * UI v2 dashboard pattern: a table on desktop that becomes cards below md
 * (never a sideways-scrolling table on a phone); row actions in a menu;
 * changes confirmed in a dialog; results announced with a toast.
 *
 * Whether a booking may still change is the API's `can_change`, never
 * re-derived here.
 */

type Tab = "upcoming" | "past";
type Pending = { kind: "cancel" | "move"; booking: Booking } | null;

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const f = err.fieldErrors;
    for (const key of ["start_at", "hours"]) if (f[key]?.length) return f[key][0];
    return err.formError;
  }
  return "Something went wrong. Please try again.";
}

const hoursOf = (b: Booking) => Math.round(b.duration_minutes / 60);
const plural = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;

export default function BookingsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [pending, setPending] = useState<Pending>(null);
  const isMobile = useIsMobile();

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

  function switchTab(t: string) {
    if (t === tab) return;
    setRows(null);
    setTab(t as Tab);
  }

  function done(message: string) {
    setPending(null);
    toast.success(message);
    setReload((n) => n + 1);
  }

  const body = loadFailed ? (
    <ErrorState message="Your bookings could not be loaded." onRetry={() => setReload((n) => n + 1)} />
  ) : rows === null ? (
    <RowsSkeleton />
  ) : rows.length === 0 ? (
    tab === "upcoming" ? (
      <EmptyState
        icon={CalendarPlus}
        title="No upcoming sessions"
        body="Book a room and engineer; ONA confirms the time with you."
        action={
          <Button asChild className="h-11">
            <Link href="/customer/book">Book a session</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState icon={CalendarClock} title="Nothing here yet" body="Past and cancelled sessions will show here." />
    )
  ) : isMobile ? (
    <BookingCards rows={rows} onAct={setPending} />
  ) : (
    <BookingTable rows={rows} onAct={setPending} />
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader title="Your bookings" description="Times are Accra time." />

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList aria-label="Bookings" className="mb-4">
          <TabsTrigger value="upcoming" className="min-h-11 px-4 md:min-h-8">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="min-h-11 px-4 md:min-h-8">
            Past
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">{body}</TabsContent>
        <TabsContent value="past">{body}</TabsContent>
      </Tabs>

      <CancelDialog booking={pending?.kind === "cancel" ? pending.booking : null} onClose={() => setPending(null)} onDone={done} />
      <RescheduleDialog booking={pending?.kind === "move" ? pending.booking : null} onClose={() => setPending(null)} onDone={done} />
    </div>
  );
}

/* ── Desktop: table ─────────────────────────────────────────────────────── */

function BookingTable({ rows, onAct }: { rows: Booking[]; onAct: (p: Pending) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableHeader className="bg-surface-alt">
          <TableRow>
            <TableHead className="pl-4">Session</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id} data-testid="booking-row">
              <TableCell className="py-3 pl-4">
                <p className="font-bold text-ink">{b.room.name}</p>
                <p className="text-[13px] text-ink-mute">
                  {b.service.name} with {b.engineer.name} · <span className="whitespace-nowrap font-mono">{b.reference}</span>
                </p>
                <ProfessionalLine booking={b} />
              </TableCell>
              <TableCell>
                <p className="text-ink">{fmtShortDay(b.start_at)}</p>
                <p className="text-[13px] text-ink-mute">
                  {fmtTime(b.start_at)}–{fmtTime(b.end_at)} · {plural(hoursOf(b))}
                </p>
              </TableCell>
              <TableCell>
                <StatusPill status={b.status} />
              </TableCell>
              <TableCell className="text-right">
                <p className="font-bold tabular-nums text-ink">{b.total_display}</p>
                {b.can_pay_online ? <PayButton booking={b} compact className="mt-1.5" /> : null}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <RowActions booking={b} onAct={onAct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── Phone: cards ───────────────────────────────────────────────────────── */

function BookingCards({ rows, onAct }: { rows: Booking[]; onAct: (p: Pending) => void }) {
  return (
    <ul className="space-y-3">
      {rows.map((b) => (
        <li key={b.id} data-testid="booking-row" className="rounded-xl border border-border-default bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-ink">{b.room.name}</p>
              <p className="text-[14px] text-ink">
                {fmtDay(b.start_at)}
              </p>
              <p className="text-[13.5px] text-ink-dim">
                {fmtTime(b.start_at)}–{fmtTime(b.end_at)} · {plural(hoursOf(b))}
              </p>
            </div>
            <RowActions booking={b} onAct={onAct} />
          </div>
          <p className="mt-2 text-[13px] text-ink-mute">
            {b.service.name} with {b.engineer.name} · <span className="whitespace-nowrap font-mono">{b.reference}</span>
          </p>
          <ProfessionalLine booking={b} />
          <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
            <StatusPill status={b.status} />
            <b className="tabular-nums text-ink">{b.total_display}</b>
          </div>
          <PayButton booking={b} className="mt-3 w-full" />
        </li>
      ))}
    </ul>
  );
}

/** A professional ONA arranged for the session (Task 15) — stage name and fee. */
function ProfessionalLine({ booking: b }: { booking: Booking }) {
  if (!b.professional) return null;
  return (
    <p className="mt-0.5 text-[13px] font-bold text-ona-blue">
      With {b.professional.display_name}
      {b.professional_fee_pesewas ? <span className="font-normal text-ink-mute"> · {b.professional_fee_display}</span> : null}
    </p>
  );
}

/* ── Row actions ────────────────────────────────────────────────────────── */

function RowActions({ booking: b, onAct }: { booking: Booking; onAct: (p: Pending) => void }) {
  async function download(kind: "invoice" | "receipt") {
    const id = toast.loading(`Preparing your ${kind}…`);
    try {
      await downloadDocument(b, kind);
      toast.dismiss(id);
    } catch (err) {
      toast.error(errorText(err), { id });
    }
  }

  // Non-modal: the items open a Dialog, and a modal menu closing while a
  // modal dialog opens can leave pointer-events locked on <body> (Radix).
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${b.reference}`} className="size-11 md:size-8">
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {b.can_change ? (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => onAct({ kind: "move", booking: b })}>
            <CalendarClock aria-hidden="true" />
            Reschedule
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => void download("invoice")}>
          <FileText aria-hidden="true" />
          Invoice (PDF)
        </DropdownMenuItem>
        {b.has_receipt ? (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => void download("receipt")}>
            <Receipt aria-hidden="true" />
            Receipt (PDF)
          </DropdownMenuItem>
        ) : null}
        {b.can_change ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 md:min-h-8"
              onSelect={() => onAct({ kind: "cancel", booking: b })}
            >
              <XCircle aria-hidden="true" />
              Cancel booking
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Dialogs ────────────────────────────────────────────────────────────── */

function useAction(onDone: (m: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<Booking>, message: (r: Booking) => string) {
    setBusy(true);
    setError(null);
    try {
      const r = await action();
      onDone(message(r));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function CancelDialog({
  booking: b,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { busy, error, setError, run } = useAction(onDone);
  return (
    <Dialog
      open={b !== null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setError(null);
          onClose();
        }
      }}
    >
      {b ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black">Cancel {b.reference}?</DialogTitle>
            <DialogDescription>
              {b.room.name}, {fmtDay(b.start_at)} at {fmtTime(b.start_at)}. The slot is released for someone else.
              {b.paid_pesewas > 0 ? null : " No payment has been taken."}
            </DialogDescription>
          </DialogHeader>
          {b.paid_pesewas > 0 ? (
            // QA F1: a paid booking must never be told "no payment has been taken".
            <p role="note" className="rounded-md bg-warn-bg px-3 py-2.5 text-[14px] text-warn">
              You have paid <b>{b.paid_display}</b> for this booking. Cancelling does not return it
              automatically — ONA holds it and will contact you about it.
            </p>
          ) : null}
          {error ? <FormError message={error} /> : null}
          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={busy} onClick={onClose}>
              Keep it
            </Button>
            <Button
              className="h-11 bg-err text-white hover:bg-err/90"
              disabled={busy}
              onClick={() => void run(() => cancelBooking(b.id), (r) => `${r.reference} was cancelled.`)}
            >
              {busy ? "One moment…" : "Yes, cancel it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function RescheduleDialog({
  booking: b,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const { busy, error, setError, run } = useAction(onDone);
  return (
    <Dialog
      open={b !== null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setError(null);
          onClose();
        }
      }}
    >
      {b ? (
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black">Reschedule {b.reference}</DialogTitle>
            <DialogDescription>
              Pick a new start — same room, engineer and length ({plural(hoursOf(b))}), same price. Accra time.
            </DialogDescription>
          </DialogHeader>
          {error ? <FormError message={error} /> : null}
          <SlotPicker
            roomId={b.room.id}
            engineerId={b.engineer.id}
            hours={hoursOf(b)}
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
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
