"use client";

import { ArrowRight, Banknote, CalendarCheck2, CalendarDays, CalendarRange, Hourglass } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { BookingConsole, BookingList } from "@/components/admin/booking-console";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { LaunchGuide } from "@/components/journey/launch-guide";
import { NewCustomersCard } from "@/components/journey/new-customers";
import { SpotlightTour, type TourStop } from "@/components/journey/spotlight-tour";
import { Button } from "@/components/ui/button";
import { adminApi, type Overview } from "@/lib/api/admin";
import { fetchJourney, updateJourney } from "@/lib/api/journey";

/** First visit to the console: a short walk past what ONA will use daily. */
const CONSOLE_TOUR: TourStop[] = [
  { target: "launch-guide", title: "Launch checklist", body: "Everything that must be true before real customers book. It ticks itself as each part is set up." },
  { target: "stats", title: "The day at a glance", body: "Sessions today, bookings still waiting on a deposit, the week ahead and the money in. Every number is live." },
  { target: "needs-confirmation", title: "Needs confirmation", body: "Bookings held for a customer. Open one to confirm it, take a payment by hand or call them." },
  { target: "new-customers", title: "New customers", body: "Who joined, what they came for and how far they got. Someone stuck at “Signed up” may just need a call." },
  { target: "nav-admin-bookings", title: "Every booking", body: "Search, filter by status or day, and add a walk-in or phone booking." },
];

/**
 * Admin console home — /admin (Task 14).
 *
 * What a studio manager opens the day with: the numbers, the bookings
 * waiting on ONA to confirm them, and today's sessions. Every figure comes
 * from /admin/overview/; nothing here is a placeholder.
 */
export default function AdminHome() {
  const [data, setData] = useState<Overview | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi
      .overview()
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [reload]);

  // The tour shows once per account (stored server-side, so a new laptop does
  // not replay it), and only after the overview has rendered its targets.
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (!data) return;
    let live = true;
    fetchJourney()
      .then((j) => live && !j.tours_seen.includes("console") && setTour(true))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [data]);
  const endTour = useCallback(() => {
    setTour(false);
    updateJourney({ tour_seen: "console" }).catch(() => undefined);
  }, []);

  const v = <K extends keyof Overview>(k: K) => (data === null ? null : data?.[k]);

  return (
    <BookingConsole onChanged={refresh}>
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          title="Control room"
          description="Today at the studio, and what is waiting on ONA."
          actions={
            <Button asChild variant="outline" className="h-11 md:h-9">
              <Link href="/admin/bookings">
                <CalendarDays aria-hidden="true" />
                All bookings
              </Link>
            </Button>
          }
        />

        {data === null ? (
          <div className="mb-6">
            <ErrorState message="The console numbers could not be loaded." onRetry={refresh} />
          </div>
        ) : null}

        <LaunchGuide />

        <div data-tour="stats">
          <StatGrid label="Studio at a glance">
            <StatCard
              brand
              icon={CalendarCheck2}
              label="Sessions today"
              value={v("today_count")}
              hint={data ? (data.today_count ? "Listed below" : "Nothing booked today") : undefined}
            />
            <StatCard
              icon={Hourglass}
              label="Awaiting deposit"
              value={v("pending_count")}
              hint={data ? (data.pending_count ? "Confirm or call the customer" : "All caught up") : undefined}
            />
            <StatCard
              icon={CalendarRange}
              label="Next 7 days"
              value={v("week_count")}
              hint={data ? `${data.week_hours} studio hours booked` : undefined}
            />
            <StatCard
              icon={Banknote}
              label="Received, 30 days"
              value={v("received_30d_display")}
              hint={data ? `ONA commission ${data.commission_30d_display}` : undefined}
            />
          </StatGrid>
        </div>

        {data ? <NewCustomersCard data={data} /> : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            id="pending-h"
            tour="needs-confirmation"
            title="Needs confirmation"
            more={data?.pending_count ? { href: "/admin/bookings?status=pending", label: `All ${data.pending_count}` } : undefined}
          >
            {data === undefined ? (
              <RowsSkeleton rows={2} />
            ) : data && data.needs_confirmation.length ? (
              <BookingList compact rows={data.needs_confirmation} />
            ) : data ? (
              <EmptyState icon={Hourglass} title="Nothing waiting" body="New bookings that need ONA to confirm them appear here." />
            ) : null}
          </Panel>

          <Panel id="today-h" title="Today" more={{ href: "/admin/bookings?when=today", label: "Open" }}>
            {data === undefined ? (
              <RowsSkeleton rows={2} />
            ) : data && data.today.length ? (
              <BookingList compact rows={data.today} />
            ) : data ? (
              <EmptyState icon={CalendarCheck2} title="No sessions today" body="Today's bookings appear here, earliest first." />
            ) : null}
          </Panel>
        </div>
      </div>
      <SpotlightTour stops={CONSOLE_TOUR} open={tour} onDone={endTour} />
    </BookingConsole>
  );
}

function Panel({
  id,
  tour,
  title,
  more,
  children,
}: {
  id: string;
  tour?: string;
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} data-tour={tour} className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className="text-[17px] font-black tracking-tight text-ink">
          {title}
        </h2>
        {more ? (
          <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
            <Link href={more.href}>
              {more.label} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
