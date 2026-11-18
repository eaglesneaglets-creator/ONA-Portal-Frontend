"use client";

import { CreditCard, Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Pager } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLoaded } from "@/hooks/use-paged-list";
import { MY_PAYMENTS_PAGE, myPaymentsApi, type MyPayment, type PaymentStatus } from "@/lib/api/account";
import { fmtShortDay } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

/**
 * /customer/payments — every payment, its receipt, and any refund (C6).
 * Invoices stay on each booking (Bookings → … → Invoice); a receipt belongs
 * to one payment, so it lives here.
 */
export default function CustomerPaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, refresh } = useLoaded(() => myPaymentsApi.list(page), [page]);
  const isMobile = useIsMobile();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Payments"
        description="What you have paid ONA, with a receipt for each payment. Invoices are on each booking."
      />
      {data === null ? (
        <ErrorState message="Your payments could not be loaded." onRetry={refresh} />
      ) : data === undefined ? (
        <RowsSkeleton rows={4} />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          body="When you pay a deposit or a balance, it appears here with its receipt."
        />
      ) : (
        <>
          {isMobile ? <PaymentCards rows={data.results} /> : <PaymentTable rows={data.results} />}
          <Pager page={page} pageSize={MY_PAYMENTS_PAGE} count={data.count} onPage={setPage} />
        </>
      )}
    </div>
  );
}

const TONE: Record<PaymentStatus, string> = {
  succeeded: "bg-ok-bg text-ok",
  pending: "bg-warn-bg text-warn",
  failed: "bg-err-bg text-err",
};

const WORDS: Record<PaymentStatus, string> = {
  succeeded: "Paid",
  pending: "Not finished",
  failed: "Did not go through",
};

function StatusPill({ p }: { p: MyPayment }) {
  const refunded = p.refunded_pesewas > 0;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold whitespace-nowrap",
      refunded ? "bg-info-bg text-info" : TONE[p.status])}>
      {refunded ? (p.refunded_pesewas >= p.amount_pesewas ? "Refunded" : "Part refunded") : WORDS[p.status]}
    </span>
  );
}

function ReceiptButton({ p, full = false }: { p: MyPayment; full?: boolean }) {
  const [busy, setBusy] = useState(false);
  if (!p.receipt_number) return <span className="text-[13px] text-ink-mute">—</span>;
  async function go() {
    setBusy(true);
    try {
      await myPaymentsApi.downloadReceipt(p);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.formError : "The receipt could not be downloaded.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={go}
      className={cn("h-11 md:h-8", full && "w-full")} aria-label={`Download receipt ${p.receipt_number}`}>
      <Download aria-hidden="true" />
      {busy ? "Preparing…" : "Receipt"}
    </Button>
  );
}

function Amount({ p }: { p: MyPayment }) {
  return (
    <span className="tabular-nums">
      <span className="font-bold text-ink">{p.amount_display}</span>
      {p.fee_display ? <span className="block text-[12.5px] text-ink-mute">+ {p.fee_display} Paystack fee</span> : null}
      {p.refunded_display ? <span className="block text-[12.5px] text-info">{p.refunded_display} refunded</span> : null}
    </span>
  );
}

function PaymentTable({ rows }: { rows: MyPayment[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>How</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right"><span className="sr-only">Receipt</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id} data-testid="payment-row">
              <TableCell className="whitespace-nowrap tabular-nums">{fmtShortDay(p.created_at)}</TableCell>
              <TableCell>
                <Link href="/customer/bookings" className="font-semibold text-ink underline-offset-4 hover:underline">
                  {p.booking.reference}
                </Link>
                <span className="block text-[12.5px] text-ink-mute">
                  {p.booking.room} · {fmtShortDay(p.booking.start_at)}
                </span>
              </TableCell>
              <TableCell className="text-ink-dim">{p.how}</TableCell>
              <TableCell className="text-right"><Amount p={p} /></TableCell>
              <TableCell><StatusPill p={p} /></TableCell>
              <TableCell className="text-right"><ReceiptButton p={p} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentCards({ rows }: { rows: MyPayment[] }) {
  return (
    <ul className="grid gap-3">
      {rows.map((p) => (
        <li key={p.id} data-testid="payment-row" className="grid gap-3 rounded-xl border border-border-default bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-ink">{p.booking.reference}</p>
              <p className="text-[13px] text-ink-mute">{p.booking.room} · {fmtShortDay(p.booking.start_at)}</p>
            </div>
            <StatusPill p={p} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="text-[13px] text-ink-dim">
              <p>{fmtShortDay(p.created_at)}</p>
              <p>{p.how}</p>
            </div>
            <div className="text-right"><Amount p={p} /></div>
          </div>
          {p.receipt_number ? <ReceiptButton p={p} full /> : null}
        </li>
      ))}
    </ul>
  );
}
