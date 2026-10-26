"use client";

import { Plus, UserRoundCog } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/auth/fields";
import { Pager, SearchBox } from "@/components/dashboard/list-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
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
  PAGE_SIZE,
  RATE_TYPES,
  type Page,
  type Professional,
  type ProfessionalInput,
  type RateType,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { parseGhsToPesewas, pesewasToInput } from "@/lib/money";

/**
 * /admin/professionals — the people ONA can put on a session (Task 13, UI in
 * Task 15). Staff-only records: no login in v0.1 (ADR-016). Contact details
 * and notes never leave this console; customers see a stage name and skills.
 */
export default function AdminProfessionalsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Professional> | null | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Professional | "new" | null>(null);
  const isMobile = useIsMobile();
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    adminApi
      .professionals({ search: search || undefined, page })
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
        title="Professionals"
        description="Session musicians, producers and other creatives ONA can arrange. Staff-only records."
        actions={
          <Button className="h-11 md:h-9" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Add professional
          </Button>
        }
      />
      <div className="mb-4">
        <SearchBox label="Search professionals" placeholder="Name, stage name, email or phone" onSearch={onSearch} />
      </div>

      {data === null ? (
        <ErrorState message="Professionals could not be loaded." onRetry={refresh} />
      ) : data === undefined ? (
        <RowsSkeleton rows={4} />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={UserRoundCog}
          title={search ? "No professionals match" : "No professionals yet"}
          body={search ? "Try another name." : "Add the people ONA works with, so they can be assigned to sessions and jobs."}
          action={search ? undefined : <Button className="h-11" onClick={() => setEditing("new")}>Add professional</Button>}
        />
      ) : (
        <>
          {isMobile ? (
            <ul className="space-y-3">
              {data.results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    data-testid="admin-pro-row"
                    className="w-full rounded-xl border border-border-default bg-surface p-4 text-left"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <b className="text-ink">{p.stage_name || p.name}</b>
                      {p.is_active ? null : <Badge variant="outline">Inactive</Badge>}
                    </span>
                    {p.stage_name ? <span className="block text-[13px] text-ink-mute">{p.name}</span> : null}
                    <span className="mt-1 block text-[13.5px] text-ink-dim">{p.rate_display}</span>
                    <Skills skills={p.skills} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-default bg-surface">
              <Table>
                <TableHeader className="bg-surface-alt">
                  <TableRow>
                    <TableHead className="pl-4">Professional</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((p) => (
                    <TableRow key={p.id} data-testid="admin-pro-row" className="cursor-pointer" onClick={() => setEditing(p)}>
                      <TableCell className="pl-4">
                        <p className="font-bold text-ink">{p.stage_name || p.name}</p>
                        {p.stage_name ? <p className="text-[13px] text-ink-mute">{p.name}</p> : null}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <Skills skills={p.skills} />
                      </TableCell>
                      <TableCell className="text-ink">{p.rate_display}</TableCell>
                      <TableCell className="text-[13px] text-ink-dim">
                        {p.phone || "—"}
                        {p.email ? <span className="block truncate">{p.email}</span> : null}
                      </TableCell>
                      <TableCell className="pr-4">
                        {p.is_active ? <Badge className="bg-ok-bg text-ok">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pager page={page} pageSize={PAGE_SIZE} count={data.count} onPage={setPage} />
        </>
      )}

      <ProfessionalDialog
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={(p, created) => {
          setEditing(null);
          toast.success(created ? `${p.stage_name || p.name} added.` : `${p.stage_name || p.name} saved.`);
          refresh();
        }}
      />
    </div>
  );
}

function Skills({ skills }: { skills: string[] }) {
  if (!skills.length) return <span className="text-[13px] text-ink-mute">—</span>;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {skills.map((s) => (
        <Badge key={s} variant="secondary" className="font-normal">
          {s}
        </Badge>
      ))}
    </span>
  );
}

function ProfessionalDialog({
  target,
  onClose,
  onSaved,
}: {
  target: Professional | "new" | null;
  onClose: () => void;
  onSaved: (p: Professional, created: boolean) => void;
}) {
  const open = target !== null;
  const existing = target && target !== "new" ? target : null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open ? (
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black">
              {existing ? `Edit ${existing.stage_name || existing.name}` : "Add a professional"}
            </DialogTitle>
            <DialogDescription>Contact details and notes stay with ONA. Customers see the stage name and skills.</DialogDescription>
          </DialogHeader>
          <ProfessionalForm key={existing?.id ?? "new"} existing={existing} onCancel={onClose} onSaved={onSaved} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function ProfessionalForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing: Professional | null;
  onCancel: () => void;
  onSaved: (p: Professional, created: boolean) => void;
}) {
  const [f, setF] = useState({
    name: existing?.name ?? "",
    stage_name: existing?.stage_name ?? "",
    skills: existing?.skills.join(", ") ?? "",
    rate_type: (existing?.rate_type ?? "negotiable") as RateType,
    rate: existing?.rate_pesewas ? pesewasToInput(existing.rate_pesewas) : "",
    phone: existing?.phone ?? "",
    email: existing?.email ?? "",
    notes: existing?.notes ?? "",
    is_active: existing?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    let rate: number | null = null;
    if (f.rate_type !== "negotiable") {
      rate = parseGhsToPesewas(f.rate);
      if (rate === null || rate === 0) {
        setFieldErrors({ rate_pesewas: ["Enter the rate in cedis, or choose Negotiable."] });
        return;
      }
    }
    const input: ProfessionalInput = {
      name: f.name.trim(),
      stage_name: f.stage_name.trim(),
      skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
      rate_type: f.rate_type,
      rate_pesewas: rate,
      phone: f.phone.trim(),
      email: f.email.trim(),
      notes: f.notes,
      is_active: f.is_active,
    };
    setBusy(true);
    try {
      const saved = existing
        ? await adminApi.updateProfessional(existing.id, input)
        : await adminApi.createProfessional(input);
      onSaved(saved, !existing);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(Object.keys(err.fieldErrors).length ? null : err.formError);
      } else setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const err = (k: string) => fieldErrors[k]?.[0];
  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="pro-name" label="Name" value={f.name} onChange={(v) => set("name", v)} error={err("name")} />
        <F id="pro-stage" label="Stage name (shown to customers)" value={f.stage_name} onChange={(v) => set("stage_name", v)} error={err("stage_name")} />
      </div>
      <F id="pro-skills" label="Skills, separated by commas" placeholder="session guitar, mixing" value={f.skills} onChange={(v) => set("skills", v)} error={err("skills")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="pro-rate-type">Rate</Label>
          <Select value={f.rate_type} onValueChange={(v) => set("rate_type", v as RateType)}>
            <SelectTrigger id="pro-rate-type" className="h-11 w-full md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {f.rate_type !== "negotiable" ? (
          <F id="pro-rate" label="Amount (GHS)" inputMode="decimal" placeholder="e.g. 300" value={f.rate} onChange={(v) => set("rate", v)} error={err("rate_pesewas")} />
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="pro-phone" label="Phone" type="tel" value={f.phone} onChange={(v) => set("phone", v)} error={err("phone")} />
        <F id="pro-email" label="Email" type="email" value={f.email} onChange={(v) => set("email", v)} error={err("email")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pro-notes">Notes (staff only)</Label>
        <Textarea id="pro-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
        <input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} className="size-4 accent-ona-red" />
        Available for new sessions and jobs
      </label>
      <FormError message={error} />
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={busy}>
          {busy ? "Saving…" : existing ? "Save" : "Add professional"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function F({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} className="h-11 md:h-9" {...rest} />
      {error ? <p className="text-[13px] text-err">{error}</p> : null}
    </div>
  );
}
