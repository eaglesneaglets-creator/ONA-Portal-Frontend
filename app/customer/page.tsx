"use client";

import { ArrowRight, CalendarCheck2, CalendarClock, CalendarPlus, Clock3, Hourglass } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { VerifyEmailBanner } from "@/components/auth/verify-email-banner";
import { StatusPill } from "@/components/booking/status-pill";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchBookingSummary,
  fmtDay,
  fmtShortDay,
  fmtTime,
  listBookings,
  type Booking,
  type BookingSummary,
} from "@/lib/api/bookings";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Customer overview — /customer (UI v2: KPI row → primary card → list).
 *
 * The studio half of the customer dashboard. Projects, activity and escrow
 * belong to the marketplace (ADR-015) and the payments phase, and arrive
 * with them — no placeholder panels in the meantime.
 */

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", hour: "numeric", hour12: false }).format(new Date()),
  );
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function CustomerHome() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<BookingSummary | null | undefined>(undefined);
  const [upcoming, setUpcoming] = useState<Booking[] | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    fetchBookingSummary()
      .then((s) => live && setSummary(s))
      .catch(() => live && setSummary(null));
    listBookings("upcoming")
      .then((r) => live && setUpcoming(r))
      .catch(() => live && setUpcoming(null));
    return () => {
      live = false;
    };
  }, []);

  const next = summary?.next ?? null;
  // The next session already has its own card; the list shows what follows.
  const later = upcoming?.filter((b) => b.id !== next?.id).slice(0, 4);
  const stat = (n: number | undefined) => (summary === null ? null : n);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={`${greeting()}${user?.first_name ? `, ${user.first_name}` : ""}`}
        description="Your studio sessions at a glance."
      />

      <VerifyEmailBanner />

      {summary === null ? (
        <p role="alert" className="mb-6 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          Your numbers could not be loaded just now. Your bookings are safe —{" "}
          <Link href="/customer/bookings" className="font-bold underline">
            see the full list
          </Link>
          .
        </p>
      ) : null}

      <StatGrid label="Summary">
        <StatCard
          brand
          icon={CalendarCheck2}
          label="Upcoming sessions"
          value={stat(summary?.upcoming_count)}
          hint={next ? `Next on ${fmtShortDay(next.start_at)}` : "Nothing booked yet"}
        />
        <StatCard
          icon={Hourglass}
          label="Awaiting confirmation"
          value={stat(summary?.pending_count)}
          hint={summary?.pending_count ? "ONA will confirm these with you" : "All confirmed"}
        />
        <StatCard
          icon={Clock3}
          label="Hours booked ahead"
          value={stat(summary?.upcoming_hours)}
          hint="Across upcoming sessions"
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-5">
        <section aria-labelledby="next-h" className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle id="next-h" className="text-[17px] font-black">
                Next session
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary === undefined ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : next ? (
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-2 flex flex-wrap items-center gap-2">
                      <b className="text-[19px] text-ink">{next.service.name}</b>
                      <StatusPill status={next.status} />
                    </p>
                    <p className="flex items-center gap-2 text-[15px] text-ink">
                      <CalendarClock aria-hidden="true" className="size-4 text-ona-blue" />
                      {fmtDay(next.start_at)}, {fmtTime(next.start_at)}–{fmtTime(next.end_at)}
                    </p>
                    <p className="mt-1 text-[14px] text-ink-mute">
                      {next.room.name} with {next.engineer.name} ·{" "}
                      <span className="whitespace-nowrap font-mono">{next.reference}</span>
                    </p>
                    {next.professional ? (
                      <p className="mt-1 text-[14px] font-bold text-ona-blue">With {next.professional.display_name}</p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" className="h-11">
                    <Link href="/customer/bookings">Manage bookings</Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarPlus}
                  title="No session booked"
                  body="Rooms come with an engineer. Pick a time and ONA confirms it with you."
                  action={
                    <Button asChild className="h-11">
                      <Link href="/customer/book">Book a session</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="later-h" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle id="later-h" className="text-[17px] font-black">
                Coming up
              </CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm" className="h-11 md:h-8">
                  <Link href="/customer/bookings">
                    View all <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {upcoming === undefined ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : upcoming === null ? (
                <p className="text-[14px] text-ink-mute">Could not load your sessions just now.</p>
              ) : later && later.length > 0 ? (
                <ul className="divide-y divide-border-soft">
                  {later.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-bold text-ink">{b.room.name}</p>
                        <p className="text-[13px] text-ink-mute">
                          {fmtShortDay(b.start_at)} · {fmtTime(b.start_at)}
                        </p>
                      </div>
                      <StatusPill status={b.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-ink-mute">
                  {next ? "Nothing else booked after your next session." : "Your upcoming sessions will show here."}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
