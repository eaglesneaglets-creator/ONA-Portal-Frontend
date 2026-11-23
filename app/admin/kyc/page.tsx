"use client";

import { ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Pager } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { KycStatusBadge } from "@/components/kyc/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable, HiddenHead } from "@/components/dashboard/data-table";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLoaded } from "@/hooks/use-paged-list";
import { kycAdminApi, type ReviewFilter, type ReviewRow } from "@/lib/api/kyc";

const FILTERS: { value: ReviewFilter; label: string; empty: string }[] = [
  { value: "waiting", label: "Waiting", empty: "Nobody is waiting for a decision." },
  { value: "changes_requested", label: "Changes requested", empty: "No checks are waiting on the person." },
  { value: "approved", label: "Verified", empty: "No one has been verified yet." },
  { value: "rejected", label: "Not verified", empty: "No checks have been turned down." },
];

const fmtWhen = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
        new Date(iso),
      )
    : "—";

/**
 * /admin/kyc — identity checks from ONA's users, oldest waiting first.
 * Decisions happen on the detail page; this is the queue.
 */
export default function AdminKycPage() {
  const [filter, setFilter] = useState<ReviewFilter>("waiting");
  const [page, setPage] = useState(1);
  const { data, refresh } = useLoaded(() => kycAdminApi.queue(filter, page), [filter, page]);
  const isMobile = useIsMobile();
  const current = FILTERS.find((f) => f.value === filter)!;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Identity checks"
        description="Compare each person's ID and selfie with what they typed, then decide."
      />
      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as ReviewFilter);
          setPage(1);
        }}
        className="mb-4"
      >
        {/* One swipeable row on a phone (four tabs do not fit at 360px and
            used to wrap onto the list); wraps from md up. */}
        <div className="-mx-4 overflow-x-auto px-4 max-md:scroll-fade-x md:mx-0 md:px-0">
          <TabsList className="h-auto md:flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="min-h-11 flex-none px-3 md:min-h-9">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {data === null ? (
        <ErrorState message="Identity checks could not be loaded. The KYC service may be unavailable." onRetry={refresh} />
      ) : data === undefined ? (
        <RowsSkeleton rows={4} />
      ) : data.results.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={current.empty} />
      ) : (
        <>
          {isMobile ? <Cards rows={data.results} /> : <ReviewTable rows={data.results} />}
          <Pager page={page} pageSize={data.page_size} count={data.count} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Who({ r }: { r: ReviewRow }) {
  return (
    <>
      <p className="font-bold text-ink">{r.full_name || r.person?.name || "Unknown account"}</p>
      <p className="text-[12.5px] text-ink-dim">
        {r.person ? r.person.email : "No matching ONA account"}
        {r.person?.public_ref ? ` · #${String(r.person.public_ref).padStart(3, "0")}` : ""}
      </p>
    </>
  );
}

function Flags({ r }: { r: ReviewRow }) {
  if (!r.flags.length) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[12px] font-bold text-warn">
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      {r.flags.includes("duplicate_id") ? "ID used elsewhere" : "Flagged"}
    </span>
  );
}

function ReviewTable({ rows }: { rows: ReviewRow[] }) {
  return (
    <DataTable
      caption="Identity checks"
      head={
        <>
          <TableHead className="pl-4">Person</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Decided</TableHead>
          <HiddenHead label="Open" className="w-28 pr-4" />
        </>
      }
    >
      {rows.map((r) => (
        <TableRow key={r.id} data-testid="kyc-row">
          <TableCell className="pl-4">
            <Who r={r} />
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap items-center gap-2">
              <KycStatusBadge status={r.status} />
              <Flags r={r} />
            </div>
          </TableCell>
          <TableCell className="text-ink-dim tabular-nums">{fmtWhen(r.submitted_at)}</TableCell>
          <TableCell className="text-ink-dim tabular-nums">{fmtWhen(r.decided_at)}</TableCell>
          <TableCell className="pr-4 text-right">
            <Button asChild size="sm" variant={r.status === "submitted" || r.status === "in_review" ? "default" : "outline"}>
              <Link href={`/admin/kyc/${r.id}`}>
                {r.status === "submitted" || r.status === "in_review" ? "Review" : "Open"}
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}

function Cards({ rows }: { rows: ReviewRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} data-testid="kyc-row">
          <Link
            href={`/admin/kyc/${r.id}`}
            className="flex items-center gap-3 rounded-xl border border-border-default bg-surface p-4 hover:bg-surface-sunk"
          >
            <div className="min-w-0 flex-1">
              <Who r={r} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <KycStatusBadge status={r.status} />
                <Flags r={r} />
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-mute">Sent {fmtWhen(r.submitted_at)}</p>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 flex-none text-ink-mute" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
