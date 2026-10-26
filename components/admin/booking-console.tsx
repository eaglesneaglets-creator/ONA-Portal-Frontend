"use client";

/**
 * The staff booking console — shared by the admin overview and the bookings
 * page (Task 14).
 *
 *   <BookingList>       table on desktop, cards below md (ui-v2.md §3)
 *   <RowActions>        view / confirm / complete / cancel / invoice
 *   <TransitionDialog>  confirms a lifecycle change, with an optional reason
 *   <BookingSheet>      the full record: customer, money, ledger, history
 *
 * Which actions a booking offers is the API's `allowed_actions`, never
 * re-derived here: the rules live with the row lock that enforces them.
 */

import {
  CheckCircle2,
  CircleCheckBig,
  Eye,
  FileText,
  Mail,
  MoreHorizontal,
  Phone,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/auth/fields";
import { StatusPill } from "@/components/booking/status-pill";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { adminApi, type BookingAction, type StaffBooking, type StaffBookingDetail } from "@/lib/api/admin";
import { downloadDocument, fmtDay, fmtShortDay, fmtTime } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";

const hours = (b: StaffBooking) => Math.round(b.duration_minutes / 60);
const plural = (n: number) => `${n} ${n === 1 ? "hour" : "hours"}`;
const netPaid = (b: StaffBooking) => b.paid_pesewas - b.refunded_pesewas;

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.formError : "Something went wrong. Please try again.";
}

/* ── Console context: one sheet and one dialog per page ─────────────────── */

interface Console {
  view: (id: string) => void;
  act: (b: StaffBooking, action: BookingAction) => void;
}
const ConsoleCtx = createContext<Console | null>(null);

function useConsole(): Console {
  const c = useContext(ConsoleCtx);
  if (!c) throw new Error("Booking console components must sit inside <BookingConsole>.");
  return c;
}

/**
 * Hosts the detail sheet and the transition dialog for everything inside it.
 * `onChanged` runs after a successful transition so the page can reload.
 */
export function BookingConsole({ children, onChanged }: { children: React.ReactNode; onChanged: () => void }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const [acting, setActing] = useState<{ booking: StaffBooking; action: BookingAction } | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);

  const value = useMemo<Console>(
    () => ({ view: setViewing, act: (booking, action) => setActing({ booking, action }) }),
    [],
  );

  const done = useCallback(
    (message: string) => {
      setActing(null);
      toast.success(message);
      setDetailVersion((n) => n + 1);
      onChanged();
    },
    [onChanged],
  );

  return (
    <ConsoleCtx.Provider value={value}>
      {children}
      <BookingSheet id={viewing} version={detailVersion} onClose={() => setViewing(null)} />
      <TransitionDialog pending={acting} onClose={() => setActing(null)} onDone={done} />
    </ConsoleCtx.Provider>
  );
}

/** A booking reference that opens the booking's sheet — for other lists
 *  (payments) that point at a booking. */
export function BookingLink({ id, reference }: { id: string; reference: string }) {
  const { view } = useConsole();
  return (
    <button
      type="button"
      onClick={() => view(id)}
      className="min-h-11 font-mono text-[13px] font-bold text-info underline-offset-2 hover:underline md:min-h-0"
    >
      {reference}
    </button>
  );
}

/* ── List: table on desktop, cards on phones ────────────────────────────── */

/**
 * `compact` is for half-width panels (the overview): customer, time, status
 * and actions only — the full record is one click away in the sheet.
 */
export function BookingList({
  rows,
  showCustomer = true,
  compact = false,
}: {
  rows: StaffBooking[];
  showCustomer?: boolean;
  compact?: boolean;
}) {
  const isMobile = useIsMobile();
  const { view } = useConsole();

  if (isMobile) {
    return (
      <ul className="space-y-3">
        {rows.map((b) => (
          <li key={b.id} data-testid="admin-booking-row" className="rounded-xl border border-border-default bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => view(b.id)} className="min-w-0 text-left">
                <p className="font-bold text-ink">{showCustomer ? b.customer.name : b.room.name}</p>
                <p className="text-[14px] text-ink">
                  {fmtShortDay(b.start_at)} · {fmtTime(b.start_at)}–{fmtTime(b.end_at)}
                </p>
                <p className="text-[13px] text-ink-mute">
                  {showCustomer ? `${b.room.name} · ` : ""}
                  <span className="whitespace-nowrap font-mono">{b.reference}</span>
                </p>
              </button>
              <RowActions booking={b} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
              <StatusPill status={b.status} />
              <span className="text-right">
                <b className="block tabular-nums text-ink">{b.total_display}</b>
                <PaidNote booking={b} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableHeader className="bg-surface-alt">
          <TableRow>
            {compact ? null : <TableHead className="pl-4">Reference</TableHead>}
            {showCustomer ? <TableHead className={compact ? "w-[45%] pl-4" : ""}>Customer</TableHead> : null}
            {compact ? null : <TableHead>Session</TableHead>}
            <TableHead>When</TableHead>
            <TableHead>Status</TableHead>
            {compact ? null : <TableHead className="text-right">Total</TableHead>}
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id} data-testid="admin-booking-row" className="cursor-pointer" onClick={() => view(b.id)}>
              {compact ? null : <TableCell className="pl-4 font-mono text-[13px] text-ink">{b.reference}</TableCell>}
              {showCustomer ? (
                <TableCell className={compact ? "max-w-0 pl-4" : "max-w-64"}>
                  <p className="truncate font-bold text-ink">{b.customer.name}</p>
                  <p className="truncate text-[13px] text-ink-mute">
                    {compact ? (
                      <>
                        <span className="font-mono">{b.reference}</span> · {b.room.name}
                      </>
                    ) : (
                      b.customer.phone || b.customer.email
                    )}
                  </p>
                </TableCell>
              ) : null}
              {compact ? null : (
                <TableCell>
                  <p className="text-ink">{b.room.name}</p>
                  <p className="text-[13px] text-ink-mute">{b.engineer.name}</p>
                </TableCell>
              )}
              <TableCell>
                <p className="text-ink">{fmtShortDay(b.start_at)}</p>
                <p className="text-[13px] text-ink-mute">
                  {fmtTime(b.start_at)}–{fmtTime(b.end_at)} · {plural(hours(b))}
                </p>
              </TableCell>
              <TableCell>
                <StatusPill status={b.status} />
              </TableCell>
              {compact ? null : (
                <TableCell className="text-right">
                  <p className="font-bold tabular-nums text-ink">{b.total_display}</p>
                  <PaidNote booking={b} />
                </TableCell>
              )}
              {/* The menu must not also open the sheet behind it. */}
              <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                <RowActions booking={b} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaidNote({ booking: b }: { booking: StaffBooking }) {
  const paid = netPaid(b);
  if (paid <= 0) return <span className="text-[12.5px] text-ink-mute">Unpaid</span>;
  return (
    <span className={`text-[12.5px] ${paid >= b.total_pesewas ? "text-ok" : "text-warn"}`}>
      {paid >= b.total_pesewas ? "Paid" : `${b.paid_display} paid`}
    </span>
  );
}

/* ── Row actions ────────────────────────────────────────────────────────── */

const ACTIONS: Record<BookingAction, { label: string; icon: LucideIcon }> = {
  confirm: { label: "Confirm booking", icon: CheckCircle2 },
  complete: { label: "Mark completed", icon: CircleCheckBig },
  cancel: { label: "Cancel booking", icon: XCircle },
};

export function RowActions({ booking: b }: { booking: StaffBooking }) {
  const { view, act } = useConsole();
  const positive = b.allowed_actions.filter((a) => a !== "cancel");
  return (
    // Non-modal: items open a Dialog or Sheet; see customer bookings page.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${b.reference}`} className="size-11 md:size-8">
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => view(b.id)}>
          <Eye aria-hidden="true" />
          View details
        </DropdownMenuItem>
        {positive.map((a) => {
          const { label, icon: Icon } = ACTIONS[a];
          return (
            <DropdownMenuItem key={a} className="min-h-11 md:min-h-8" onSelect={() => act(b, a)}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={() => void download(b)}>
          <FileText aria-hidden="true" />
          Invoice (PDF)
        </DropdownMenuItem>
        {b.allowed_actions.includes("cancel") ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="min-h-11 md:min-h-8" onSelect={() => act(b, "cancel")}>
              <XCircle aria-hidden="true" />
              Cancel booking
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function download(b: StaffBooking) {
  const id = toast.loading("Preparing the invoice…");
  try {
    await downloadDocument(b, "invoice");
    toast.dismiss(id);
  } catch (err) {
    toast.error(errorText(err), { id });
  }
}

/* ── Transition dialog ──────────────────────────────────────────────────── */

const COPY: Record<BookingAction, {
  title: (ref: string) => string;
  body: (b: StaffBooking) => string;
  button: string;
  done: (ref: string) => string;
}> = {
  confirm: {
    title: (ref) => `Confirm ${ref}?`,
    body: (b) => `${b.customer.name} gets an email that ONA has confirmed ${fmtDay(b.start_at)} at ${fmtTime(b.start_at)}.`,
    button: "Confirm booking",
    done: (ref) => `${ref} confirmed. The customer has been emailed.`,
  },
  complete: {
    title: (ref) => `Mark ${ref} as completed?`,
    body: (b) => `${b.customer.name} gets a thank-you email. This cannot be undone.`,
    button: "Mark completed",
    done: (ref) => `${ref} marked completed.`,
  },
  cancel: {
    title: (ref) => `Cancel ${ref}?`,
    body: (b) => `The slot is released for someone else and ${b.customer.name} is emailed. This cannot be undone.`,
    button: "Cancel booking",
    done: (ref) => `${ref} cancelled. The customer has been emailed.`,
  },
};

function TransitionDialog({
  pending,
  onClose,
  onDone,
}: {
  pending: { booking: StaffBooking; action: BookingAction } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setReason("");
    setError(null);
    onClose();
  }

  async function submit() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.transition(pending.booking.id, pending.action, reason.trim() || undefined);
      setReason("");
      onDone(COPY[pending.action].done(updated.reference));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const b = pending?.booking;
  const copy = pending ? COPY[pending.action] : null;
  const destructive = pending?.action === "cancel";

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && close()}>
      {b && copy ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black">{copy.title(b.reference)}</DialogTitle>
            <DialogDescription>{copy.body(b)}</DialogDescription>
          </DialogHeader>

          {destructive && netPaid(b) > 0 ? (
            <Alert className="border-warn/30 bg-warn-bg text-warn">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription className="text-warn">
                {b.paid_display} has been paid. Cancelling does not refund it — record the refund separately.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="transition-reason">
              Note for the record <span className="font-normal text-ink-mute">(optional, staff only)</span>
            </Label>
            <Textarea
              id="transition-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder={destructive ? "e.g. Customer called to cancel" : "e.g. Confirmed by phone"}
            />
          </div>

          {error ? <FormError message={error} /> : null}

          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={busy} onClick={close}>
              {destructive ? "Keep it" : "Back"}
            </Button>
            <Button
              className={`h-11 ${destructive ? "bg-err text-white hover:bg-err/90" : ""}`}
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "One moment…" : copy.button}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/* ── Detail sheet ───────────────────────────────────────────────────────── */

const HISTORY_LABEL: Record<string, string> = {
  "booking.confirmed": "Confirmed",
  "booking.completed": "Marked completed",
  "booking.cancelled": "Cancelled",
  "booking.rescheduled": "Rescheduled",
};

function BookingSheet({ id, version, onClose }: { id: string | null; version: number; onClose: () => void }) {
  const [detail, setDetail] = useState<StaffBookingDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const { act } = useConsole();

  useEffect(() => {
    if (!id) return;
    let live = true;
    adminApi
      .booking(id)
      .then((d) => {
        if (!live) return;
        setDetail(d);
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [id, version]);

  const d = detail && detail.id === id ? detail : null;

  return (
    <Sheet open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border-soft p-5">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-[19px] font-black">
            {d ? (
              <>
                <span className="font-mono">{d.reference}</span>
                <StatusPill status={d.status} />
              </>
            ) : (
              "Booking"
            )}
          </SheetTitle>
          <SheetDescription>{d ? `${d.room.name} · ${fmtDay(d.start_at)}` : "Loading the booking…"}</SheetDescription>
        </SheetHeader>

        {failed ? (
          <p className="p-5 text-ink">This booking could not be loaded.</p>
        ) : !d ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {d.allowed_actions.length ? (
              <div className="flex flex-wrap gap-2">
                {d.allowed_actions.map((a) => {
                  const { label, icon: Icon } = ACTIONS[a];
                  return (
                    <Button
                      key={a}
                      variant={a === "cancel" ? "outline" : "default"}
                      className={`h-11 md:h-9 ${a === "cancel" ? "text-err" : ""}`}
                      onClick={() => act(d, a)}
                    >
                      <Icon aria-hidden="true" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            ) : null}

            <Section title="Session">
              <Row label="When">
                {fmtDay(d.start_at)}, {fmtTime(d.start_at)}–{fmtTime(d.end_at)} ({plural(hours(d))})
              </Row>
              <Row label="Room">{d.room.name}</Row>
              <Row label="Engineer">{d.engineer.name}</Row>
              <Row label="Service">{d.service.name}</Row>
              {d.notes ? <Row label="Notes">{d.notes}</Row> : null}
            </Section>

            <Section title="Customer">
              <p className="font-bold text-ink">{d.customer.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="h-11 md:h-8">
                  <a href={`mailto:${d.customer.email}`}>
                    <Mail aria-hidden="true" />
                    {d.customer.email}
                  </a>
                </Button>
                {d.customer.phone ? (
                  <Button asChild variant="outline" size="sm" className="h-11 md:h-8">
                    <a href={`tel:${d.customer.phone}`}>
                      <Phone aria-hidden="true" />
                      {d.customer.phone}
                    </a>
                  </Button>
                ) : null}
              </div>
              <Link
                href={`/admin/bookings?customer=${d.customer.id}`}
                onClick={onClose}
                className="mt-2 inline-flex min-h-11 items-center text-[13.5px] font-bold text-info hover:underline md:min-h-8"
              >
                All bookings for this customer
              </Link>
            </Section>

            <Section title="Money">
              <Row label="Total">{d.total_display}</Row>
              <Row label="Paid">{d.paid_display}</Row>
              {d.transactions.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-ink-mute">No payments recorded yet.</p>
              ) : (
                <ul className="mt-3 space-y-3" aria-label="Payments">
                  {d.transactions.map((t) => (
                    <li key={t.id} className="rounded-lg border border-border-soft p-3">
                      <div className="flex items-center justify-between gap-2">
                        <b className="text-ink">{t.amount_display}</b>
                        <span className="text-[12.5px] font-bold text-ink-dim">{t.status_display}</span>
                      </div>
                      <p className="text-[12.5px] text-ink-mute">
                        {t.provider_display}
                        {t.provider_ref ? ` · ${t.provider_ref}` : ""} · {fmtShortDay(t.created_at)}
                      </p>
                      <p className="text-[12.5px] text-ink-mute">
                        Commission {t.commission_percent}% · held now {t.held_display}
                      </p>
                      {t.ledger.length ? (
                        <ul className="mt-2 space-y-1 border-t border-border-soft pt-2 text-[12.5px]">
                          {t.ledger.map((e) => (
                            <li key={e.id} className="flex justify-between gap-2">
                              <span className="text-ink-dim">
                                {e.entry_type_display}
                                {e.commission ? ` (ONA commission ${e.commission.amount_display})` : ""}
                              </span>
                              <span className="tabular-nums text-ink">{e.amount_display}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="History">
              <ol className="space-y-2 text-[13.5px]">
                <li className="text-ink-dim">
                  Booked {fmtShortDay(d.created_at)} at {fmtTime(d.created_at)}
                </li>
                {d.history
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <li key={i} className="text-ink-dim">
                      <b className="text-ink">{HISTORY_LABEL[h.action] ?? h.action}</b> by {h.actor_email ?? "the system"} ·{" "}
                      {fmtShortDay(h.created_at)} {fmtTime(h.created_at)}
                      {typeof h.metadata.reason === "string" && h.metadata.reason ? (
                        <span className="block text-ink-mute">“{h.metadata.reason}”</span>
                      ) : null}
                    </li>
                  ))}
              </ol>
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-mute">{title}</h3>
      {children}
      <Separator className="mt-5" />
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-4 py-0.5 text-[14px]">
      <span className="text-ink-mute">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </p>
  );
}
