import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerStage, Overview, RecentCustomer } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

/**
 * New customers, as a journey — how far the last 30 days' sign-ups have got
 * (a funnel: signed up → booked → deposit paid → had a session) and who the
 * newest are, with what they came for. So ONA notices a new customer the day
 * they join, and sees who stalled at "signed up" and might need a call.
 */
export const STAGE_TONE: Record<CustomerStage, string> = {
  signed_up: "bg-surface-sunk text-ink-dim",
  booked: "bg-info-bg text-info",
  paid: "bg-warn-bg text-warn",
  came_in: "bg-ok-bg text-ok",
};

export function StageChip({ stage, label }: { stage: CustomerStage; label: string }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold", STAGE_TONE[stage])}>{label}</span>;
}

function ago(iso: string): string {
  const h = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / -3_600_000));
  if (h < 1) return "just now";
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function initials(name: string): string {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function NewCustomersCard({ data }: { data: Overview }) {
  const top = data.funnel.stages[0]?.reached || 0;
  return (
    <Card className="mb-6" data-tour="new-customers" data-testid="new-customers">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-[17px] font-black">
            <Sparkles aria-hidden="true" className="size-4 text-ona-red" />
            New customers
          </CardTitle>
          <p className="mt-0.5 text-[13.5px] text-ink-dim">Joined in the last 30 days, and how far each has got.</p>
        </div>
        <Link href="/admin/customers" className="inline-flex min-h-11 items-center gap-1 text-[13.5px] font-bold text-ona-blue hover:underline md:min-h-0">
          All customers
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* The funnel: each bar is how many reached that stage. */}
        <ol className="grid gap-3" aria-label="Customer journey, last 30 days">
          {data.funnel.stages.map((s, i) => {
            const pct = top ? Math.round((s.reached / top) * 100) : 0;
            const prev = i ? data.funnel.stages[i - 1].reached : null;
            return (
              <li key={s.key}>
                <div className="mb-1 flex items-baseline justify-between text-[13.5px]">
                  <span className="font-bold text-ink">{s.label}</span>
                  <span className="tabular-nums text-ink-dim">
                    <b className="text-ink">{s.reached}</b>
                    {prev ? <span className="ml-1.5 text-[12px]">({Math.round((s.reached / prev) * 100)}%)</span> : null}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunk">
                  <span className="block h-full rounded-full bg-ona-gradient transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${Math.max(pct, s.reached ? 4 : 0)}%` }} />
                </div>
              </li>
            );
          })}
        </ol>

        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-mute">Newest</p>
          {data.new_customers.length ? (
            <ul className="grid gap-1.5">
              {data.new_customers.map((c: RecentCustomer) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/bookings?customer=${c.id}&when=all`}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-alt"
                  >
                    <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-full bg-ona-gradient text-[12.5px] font-black text-white">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[14px] text-ink">{c.name}</b>
                      <span className="block truncate text-[12.5px] text-ink-mute">
                        {c.intent_display ? `Came for: ${c.intent_display} · ` : ""}joined {ago(c.date_joined)}
                      </span>
                    </span>
                    <StageChip stage={c.stage} label={c.stage_display} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border-default px-4 py-6 text-center text-[13.5px] text-ink-mute">
              No one new in the last two weeks.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
