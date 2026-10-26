"use client";

import { CalendarDays, Mail, Phone, UserSearch } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Pager, SearchBox } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { adminApi, PAGE_SIZE, type Page, type StaffCustomer } from "@/lib/api/admin";
import { fmtShortDay } from "@/lib/api/bookings";

/**
 * /admin/customers — the customer directory (Task 14). Read-only in v0.1;
 * adding a walk-in or phone customer arrives with manual booking (Task 15).
 */
export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<StaffCustomer> | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    let live = true;
    adminApi
      .customers({ search: search || undefined, page })
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [search, page, reload]);

  const onSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Customers"
        description={data ? `${data.count} ${data.count === 1 ? "account" : "accounts"}` : "Everyone who books with ONA."}
      />
      <div className="mb-4">
        <SearchBox label="Search customers" placeholder="Name, email or phone" onSearch={onSearch} />
      </div>

      {data === null ? (
        <ErrorState message="Customers could not be loaded." onRetry={() => setReload((n) => n + 1)} />
      ) : data === undefined ? (
        <RowsSkeleton rows={5} />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title={search ? "No customers match" : "No customers yet"}
          body={search ? "Try part of a name, an email or a phone number." : "Customers appear here when they sign up."}
        />
      ) : (
        <>
          {isMobile ? <CustomerCards rows={data.results} /> : <CustomerTable rows={data.results} />}
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}
    </div>
  );
}

const bookingsHref = (c: StaffCustomer) => `/admin/bookings?customer=${c.id}&when=all`;

function CustomerTable({ rows }: { rows: StaffCustomer[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
      <Table>
        <TableHeader className="bg-surface-alt">
          <TableRow>
            <TableHead className="pl-4">Customer</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right">Bookings</TableHead>
            <TableHead>Last session</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id} data-testid="admin-customer-row">
              <TableCell className="pl-4">
                <p className="font-bold text-ink">{c.name}</p>
                {c.is_email_verified ? null : <p className="text-[12.5px] text-ink-mute">Email not verified</p>}
              </TableCell>
              <TableCell>
                <a href={`mailto:${c.email}`} className="block text-[13.5px] text-info hover:underline">
                  {c.email}
                </a>
                {c.phone ? (
                  <a href={`tel:${c.phone}`} className="block text-[13px] text-ink-dim hover:underline">
                    {c.phone}
                  </a>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <p className="text-ink">{c.booking_count}</p>
                {c.upcoming_count ? <p className="text-[12.5px] text-ink-mute">{c.upcoming_count} upcoming</p> : null}
              </TableCell>
              <TableCell className="text-ink-dim">{c.last_session_at ? fmtShortDay(c.last_session_at) : "—"}</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-ink">{c.paid_display}</TableCell>
              <TableCell className="text-ink-dim">{fmtShortDay(c.date_joined)}</TableCell>
              <TableCell className="pr-4 text-right">
                <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`Bookings for ${c.name}`}>
                  <Link href={bookingsHref(c)}>
                    <CalendarDays aria-hidden="true" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CustomerCards({ rows }: { rows: StaffCustomer[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((c) => (
        <li key={c.id} data-testid="admin-customer-row" className="rounded-xl border border-border-default bg-surface p-4">
          <p className="font-bold text-ink">{c.name}</p>
          <p className="text-[13px] text-ink-mute">
            {c.booking_count} {c.booking_count === 1 ? "booking" : "bookings"}
            {c.upcoming_count ? ` · ${c.upcoming_count} upcoming` : ""} · paid {c.paid_display}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-11">
              <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`}>
                <Mail aria-hidden="true" />
                Email
              </a>
            </Button>
            {c.phone ? (
              <Button asChild variant="outline" size="sm" className="h-11">
                <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm" className="h-11">
              <Link href={bookingsHref(c)}>
                <CalendarDays aria-hidden="true" />
                Bookings
              </Link>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
