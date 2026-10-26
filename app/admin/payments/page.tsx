"use client";

import { Banknote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BookingConsole, BookingLink } from "@/components/admin/booking-console";
import { Pager, SearchBox } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { adminApi, PAGE_SIZE, type Page, type StaffTransaction } from "@/lib/api/admin";
import { fmtShortDay, fmtTime } from "@/lib/api/bookings";

/**
 * /admin/payments — every transaction with its commission (Task 14).
 *
 * Read-only: money moves only through the ledger (provider callbacks, and
 * manual recording in Task 16). The reference opens the booking's record,
 * where the full ledger sits beside the session it paid for.
 */

const STATUS_STYLE: Record<StaffTransaction["status"], string> = {
  succeeded: "bg-ok-bg text-ok",
  pending: "bg-warn-bg text-warn",
  failed: "bg-err-bg text-err",
};

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState("any");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<StaffTransaction> | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);
  const isMobile = useIsMobile();

  useEffect(() => {
    let live = true;
    adminApi
      .payments({ status: status === "any" ? undefined : status, search: search || undefined, page })
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [status, search, page, reload]);

  const onSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  return (
    <BookingConsole onChanged={refresh}>
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader title="Payments" description="Every payment, what ONA holds, and the commission on each." />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={status}
            onValueChange={(s) => {
              setStatus(s);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Status" className="h-11 w-full bg-surface sm:w-44 md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <SearchBox label="Search payments" placeholder="Booking reference, customer or provider ref" onSearch={onSearch} />
        </div>

        {data === null ? (
          <ErrorState message="Payments could not be loaded." onRetry={refresh} />
        ) : data === undefined ? (
          <RowsSkeleton rows={4} />
        ) : data.results.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={search || status !== "any" ? "No payments match" : "No payments yet"}
            body={
              search || status !== "any"
                ? "Try another filter or search."
                : "Payments appear here once customers pay online or staff record one by hand."
            }
          />
        ) : (
          <>
            {isMobile ? <PaymentCards rows={data.results} /> : <PaymentTable rows={data.results} />}
            <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
          </>
        )}
      </div>
    </BookingConsole>
  );
}

function StatusChip({ t }: { t: StaffTransaction }) {
  return (
    <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${STATUS_STYLE[t.status]}`}>
      {t.status_display}
    </span>
  );
}

function PaymentTable({ rows }: { rows: StaffTransaction[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableHeader className="bg-surface-alt">
          <TableRow>
            <TableHead className="pl-4">Date</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="pr-4 text-right">Held now</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => (
            <TableRow key={t.id} data-testid="admin-payment-row">
              <TableCell className="pl-4">
                <p className="text-ink">{fmtShortDay(t.created_at)}</p>
                <p className="text-[12.5px] text-ink-mute">{fmtTime(t.created_at)}</p>
              </TableCell>
              <TableCell>
                <BookingLink id={t.booking.id} reference={t.booking.reference} />
              </TableCell>
              <TableCell>
                <p className="text-ink">{t.customer.name}</p>
                <p className="text-[12.5px] text-ink-mute">{t.customer.email}</p>
              </TableCell>
              <TableCell>
                {t.is_manual ? (
                  <>
                    <span className="inline-flex rounded-pill bg-info-bg px-2 py-0.5 text-[11.5px] font-bold text-ona-blue">
                      Recorded by staff
                    </span>
                    <p className="text-ink">{t.method_display}</p>
                  </>
                ) : (
                  <p className="text-ink">{t.provider_display}</p>
                )}
                {t.provider_ref ? <p className="font-mono text-[12px] text-ink-mute">{t.provider_ref}</p> : null}
              </TableCell>
              <TableCell>
                <StatusChip t={t} />
                {t.failure_reason ? <p className="mt-1 text-[12px] text-err">{t.failure_reason}</p> : null}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-ink">{t.amount_display}</TableCell>
              <TableCell className="text-right tabular-nums text-ink-dim">
                {t.commission_percent}%
                {t.ledger.some((e) => e.commission) ? (
                  <span className="block text-[12.5px]">
                    {t.ledger.filter((e) => e.commission).map((e) => e.commission!.amount_display).join(", ")}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="pr-4 text-right tabular-nums text-ink">{t.held_display}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentCards({ rows }: { rows: StaffTransaction[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((t) => (
        <li key={t.id} data-testid="admin-payment-row" className="rounded-xl border border-border-default bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-ink">{t.customer.name}</p>
              <p className="text-[13px] text-ink-mute">
                {fmtShortDay(t.created_at)} · {t.is_manual ? `${t.method_display} · recorded by staff` : t.provider_display}
              </p>
            </div>
            <b className="tabular-nums text-ink">{t.amount_display}</b>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
            <StatusChip t={t} />
            <BookingLink id={t.booking.id} reference={t.booking.reference} />
          </div>
          <p className="mt-1 text-[12.5px] text-ink-mute">
            Commission {t.commission_percent}% · held now {t.held_display}
          </p>
        </li>
      ))}
    </ul>
  );
}
