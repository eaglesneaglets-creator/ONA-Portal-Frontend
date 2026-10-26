"use client";

import { Briefcase, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CustomerPicker } from "@/components/admin/customer-picker";
import { FormError } from "@/components/auth/fields";
import { Pager, SearchBox } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  adminApi,
  JOB_STATUSES,
  PAGE_SIZE,
  type Job,
  type JobInput,
  type JobStatus,
  type Page,
  type Professional,
  type StaffCustomer,
} from "@/lib/api/admin";
import { fmtShortDay } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import { parseGhsToPesewas, pesewasToInput } from "@/lib/money";

/**
 * /admin/jobs — brokered work that is not a studio session (Task 15): a
 * voice-over, a mix, a shoot. ONA records who asked, who is doing it, the
 * agreed fee and where it stands. Jobs are cancelled, never deleted.
 */

const STATUS_STYLE: Record<JobStatus, string> = {
  requested: "bg-warn-bg text-warn",
  arranged: "bg-info-bg text-info",
  in_progress: "bg-info-bg text-ona-blue",
  completed: "bg-ok-bg text-ok",
  cancelled: "bg-surface-sunk text-ink-mute",
};

function StatusChip({ job }: { job: Job }) {
  return (
    <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${STATUS_STYLE[job.status]}`}>
      {job.status_display}
    </span>
  );
}

export default function AdminJobsPage() {
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Job> | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Job | "new" | null>(null);
  const isMobile = useIsMobile();
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi
      .jobs({
        status: status === "open" || status === "any" ? undefined : status,
        open: status === "open",
        search: search || undefined,
        page,
      })
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
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Jobs"
        description="Work ONA arranges with a professional outside the studio calendar."
        actions={
          <Button className="h-11 md:h-9" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            New job
          </Button>
        }
      />
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
            <SelectItem value="open">Open jobs</SelectItem>
            <SelectItem value="any">All jobs</SelectItem>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchBox label="Search jobs" placeholder="Reference, title, customer or professional" onSearch={onSearch} />
      </div>

      {data === null ? (
        <ErrorState message="Jobs could not be loaded." onRetry={refresh} />
      ) : data === undefined ? (
        <RowsSkeleton rows={4} />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search || status !== "open" ? "No jobs match" : "No open jobs"}
          body="When a customer asks ONA to arrange a voice-over, a mix or a shoot, record it here."
          action={<Button className="h-11" onClick={() => setEditing("new")}>New job</Button>}
        />
      ) : (
        <>
          {isMobile ? (
            <ul className="space-y-3">
              {data.results.map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => setEditing(j)} data-testid="admin-job-row"
                    className="w-full rounded-xl border border-border-default bg-surface p-4 text-left">
                    <span className="flex items-start justify-between gap-2">
                      <b className="text-ink">{j.title}</b>
                      <StatusChip job={j} />
                    </span>
                    <span className="block text-[13px] text-ink-dim">
                      {j.customer_brief.name}
                      {j.professional_brief ? ` · ${j.professional_brief.stage_name || j.professional_brief.name}` : ""}
                    </span>
                    <span className="mt-1 block text-[13px] text-ink-mute">
                      <span className="font-mono">{j.reference}</span> · {j.fee_display}
                      {j.due_on ? ` · due ${fmtShortDay(j.due_on)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
              <Table>
                <TableHeader className="bg-surface-alt">
                  <TableRow>
                    <TableHead className="pl-4">Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Professional</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((j) => (
                    <TableRow key={j.id} data-testid="admin-job-row" className="cursor-pointer" onClick={() => setEditing(j)}>
                      <TableCell className="pl-4">
                        <p className="font-bold text-ink">{j.title}</p>
                        <p className="font-mono text-[12.5px] text-ink-mute">{j.reference}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-ink">{j.customer_brief.name}</p>
                        <p className="text-[12.5px] text-ink-mute">{j.customer_brief.phone || j.customer_brief.email}</p>
                      </TableCell>
                      <TableCell className="text-ink">
                        {j.professional_brief ? j.professional_brief.stage_name || j.professional_brief.name : <span className="text-ink-mute">Not assigned</span>}
                      </TableCell>
                      <TableCell className="text-ink-dim">{j.due_on ? fmtShortDay(j.due_on) : "—"}</TableCell>
                      <TableCell><StatusChip job={j} /></TableCell>
                      <TableCell className="pr-4 text-right font-bold tabular-nums text-ink">{j.fee_display}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg [&>*]:min-w-0">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">
                {editing === "new" ? "New job" : `${editing.reference} · ${editing.title}`}
              </DialogTitle>
              <DialogDescription>
                {editing === "new"
                  ? "Record what the customer asked for. Assign a professional once someone is lined up."
                  : `For ${editing.customer_brief.name}. Changes are recorded in the audit log.`}
              </DialogDescription>
            </DialogHeader>
            <JobForm
              key={editing === "new" ? "new" : editing.id}
              existing={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={(j, created) => {
                setEditing(null);
                toast.success(created ? `${j.reference} created.` : `${j.reference} saved.`);
                refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function JobForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing: Job | null;
  onCancel: () => void;
  onSaved: (j: Job, created: boolean) => void;
}) {
  const [customer, setCustomer] = useState<StaffCustomer | null>(null);
  const [pros, setPros] = useState<Professional[]>([]);
  const [f, setF] = useState({
    title: existing?.title ?? "",
    brief: existing?.brief ?? "",
    status: (existing?.status ?? "requested") as JobStatus,
    professional: existing?.professional ?? "none",
    due_on: existing?.due_on ?? "",
    fee: existing?.fee_pesewas != null ? pesewasToInput(existing.fee_pesewas) : "",
    notes: existing?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  useEffect(() => {
    adminApi
      .professionals({ is_active: true, page_size: 100 })
      .then((p) => setPros(p.results))
      .catch(() => setPros([]));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const local: Record<string, string> = {};
    if (!existing && !customer) local.customer = "Find and choose the customer.";
    let fee: number | null = null;
    if (f.fee.trim()) {
      fee = parseGhsToPesewas(f.fee);
      if (fee === null) local.fee_pesewas = "Enter the fee in cedis, e.g. 500 or 500.50.";
    }
    setFieldErrors(local);
    if (Object.keys(local).length) return;

    const input: JobInput = {
      title: f.title.trim(),
      brief: f.brief,
      status: f.status,
      professional: f.professional === "none" ? null : f.professional,
      due_on: f.due_on || null,
      fee_pesewas: fee,
      notes: f.notes,
      ...(existing ? {} : { customer: customer!.id }),
    };
    setBusy(true);
    try {
      const saved = existing ? await adminApi.updateJob(existing.id, input) : await adminApi.createJob(input);
      onSaved(saved, !existing);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) fe[k] = v[0];
        setFieldErrors(fe);
        setError(Object.keys(fe).length ? null : err.formError);
      } else setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      {existing ? null : (
        <div className="grid gap-1.5">
          <span className="text-[14px] font-bold text-ink">Customer</span>
          <CustomerPicker id="job-customer" value={customer} onChange={setCustomer} error={fieldErrors.customer} />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="job-title">What is the job?</Label>
        <Input id="job-title" value={f.title} maxLength={150} placeholder="e.g. 30-second radio voice-over"
          onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(fieldErrors.title)} className="h-11 md:h-9" />
        {fieldErrors.title ? <p className="text-[13px] text-err">{fieldErrors.title}</p> : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="job-brief">Brief (what the customer asked for)</Label>
        <Textarea id="job-brief" value={f.brief} onChange={(e) => set("brief", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="job-pro">Professional</Label>
          <Select value={f.professional} onValueChange={(v) => set("professional", v)}>
            <SelectTrigger id="job-pro" className="h-11 w-full md:h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned yet</SelectItem>
              {pros.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.stage_name ? `${p.stage_name} (${p.name})` : p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.professional ? <p className="text-[13px] text-err">{fieldErrors.professional}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="job-status">Status</Label>
          <Select value={f.status} onValueChange={(v) => set("status", v as JobStatus)}>
            <SelectTrigger id="job-status" className="h-11 w-full md:h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="job-fee">Agreed fee (GHS)</Label>
          <Input id="job-fee" inputMode="decimal" placeholder="Leave empty until agreed" value={f.fee}
            onChange={(e) => set("fee", e.target.value)} aria-invalid={Boolean(fieldErrors.fee_pesewas)} className="h-11 md:h-9" />
          {fieldErrors.fee_pesewas ? <p className="text-[13px] text-err">{fieldErrors.fee_pesewas}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="job-due">Due</Label>
          <Input id="job-due" type="date" value={f.due_on} onChange={(e) => set("due_on", e.target.value)} className="h-11 md:h-9" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="job-notes">Notes (staff only)</Label>
        <Textarea id="job-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <p className="text-[12.5px] text-ink-mute">
        Payment for a job is recorded separately once manual payments are available. Nothing here moves money.
      </p>
      <FormError message={error} />
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-11" disabled={busy}>{busy ? "Saving…" : existing ? "Save" : "Create job"}</Button>
      </DialogFooter>
    </form>
  );
}
