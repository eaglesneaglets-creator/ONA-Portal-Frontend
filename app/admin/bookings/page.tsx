"use client";

import { CalendarSearch, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { BookingConsole, BookingList } from "@/components/admin/booking-console";
import { Pager, SearchBox } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, PAGE_SIZE, type Page, type StaffBooking } from "@/lib/api/admin";

/**
 * /admin/bookings — every booking, for staff (Task 14).
 *
 * Filters live in the URL (?when=&status=&customer=&q=) so a link from the
 * overview ("All 3 pending") or a customer's record lands on the right view,
 * and a refresh keeps it.
 */

type When = "upcoming" | "today" | "past" | "all";
const WHENS: { value: When; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];
const STATUSES = [
  { value: "any", label: "Any status" },
  { value: "pending", label: "Awaiting confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<RowsSkeleton />}>
      <Bookings />
    </Suspense>
  );
}

function Bookings() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = params.get("status") ?? "any";
  // A status filter reads across time unless a period was chosen explicitly.
  const when = (params.get("when") as When | null) ?? (params.get("status") ? "all" : "upcoming");
  const customer = params.get("customer") ?? "";
  const search = params.get("q") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const [data, setData] = useState<Page<StaffBooking> | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, val] of Object.entries(patch)) {
        if (val === null || val === "") next.delete(k);
        else next.set(k, val);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    let live = true;
    adminApi
      .bookings({
        when: when === "all" ? undefined : when,
        status: status === "any" ? undefined : status,
        customer: customer || undefined,
        search: search || undefined,
        page,
      })
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [when, status, customer, search, page, reload]);

  const onSearch = useCallback((q: string) => q !== search && setParams({ q }), [search, setParams]);
  const customerName = customer ? data?.results[0]?.customer.name : undefined;

  return (
    <BookingConsole onChanged={refresh}>
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader title="Bookings" description="Every studio booking. Times are Accra time." />

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={when} onValueChange={(w) => setParams({ when: w })}>
            <TabsList aria-label="Period">
              {WHENS.map((w) => (
                <TabsTrigger key={w.value} value={w.value} className="min-h-11 px-3 md:min-h-8">
                  {w.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={status} onValueChange={(s) => setParams({ status: s === "any" ? null : s })}>
              <SelectTrigger aria-label="Status" className="h-11 w-full bg-surface sm:w-52 md:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchBox
              label="Search bookings"
              placeholder="Reference, name, email or phone"
              initial={search}
              onSearch={onSearch}
            />
          </div>
        </div>

        {customer ? (
          <div className="mb-4 flex items-center gap-2 text-[14px] text-ink-dim">
            Showing bookings for <b className="text-ink">{customerName ?? "one customer"}</b>
            <Button variant="ghost" size="sm" className="h-11 md:h-8" onClick={() => setParams({ customer: null })}>
              <X aria-hidden="true" />
              Clear
            </Button>
          </div>
        ) : null}

        {data === null ? (
          <ErrorState message="Bookings could not be loaded." onRetry={refresh} />
        ) : data === undefined ? (
          <RowsSkeleton rows={5} />
        ) : data.results.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title="No bookings match"
            body={search || status !== "any" || customer ? "Try another filter or search." : "Bookings appear here as customers make them."}
          />
        ) : (
          <>
            <BookingList rows={data.results} />
            <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={(p) => setParams({ page: String(p) })} />
          </>
        )}
      </div>
    </BookingConsole>
  );
}
