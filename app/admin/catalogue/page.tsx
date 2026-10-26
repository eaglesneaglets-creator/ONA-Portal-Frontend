"use client";

import { Plus, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/auth/fields";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { adminApi, type AdminRoom, type CatalogueKind } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { parseGhsToPesewas, pesewasToInput } from "@/lib/money";

/**
 * /admin/catalogue — rooms, services, engineers and packages (Task 16).
 *
 * A price change applies to bookings made from now on; existing bookings
 * and their invoices keep the price they were made at, and every change is
 * in the audit log. Switch an item off to hide it from customers; removing
 * keeps its history with the bookings that used it.
 */

type Row = Record<string, unknown> & { id: string; name: string; is_active: boolean; sort_order: number };

type FieldKind = "text" | "textarea" | "money" | "int" | "comma" | "lines" | "room";
interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
}
interface KindDef {
  title: string;
  singular: string;
  fields: FieldDef[];
  columns: { label: string; value: (r: Row) => string; align?: "right" }[];
}

const KINDS: Record<CatalogueKind, KindDef> = {
  rooms: {
    title: "Rooms",
    singular: "room",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "hourly_rate_pesewas", label: "Rate per hour (GHS)", kind: "money", hint: "Engineer included. New bookings only." },
      { key: "capacity", label: "Capacity (people)", kind: "int" },
    ],
    columns: [
      { label: "Rate", value: (r) => `${r.hourly_rate_display}/hr`, align: "right" },
      { label: "Capacity", value: (r) => String(r.capacity), align: "right" },
    ],
  },
  services: {
    title: "Services",
    singular: "service",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "base_price_pesewas", label: "Price (GHS)", kind: "money", hint: "For one unit of the length below." },
      { key: "duration_minutes", label: "Length (minutes)", kind: "int" },
    ],
    columns: [
      { label: "Price", value: (r) => String(r.base_price_display), align: "right" },
      { label: "Length", value: (r) => `${r.duration_minutes} min`, align: "right" },
    ],
  },
  engineers: {
    title: "Engineers",
    singular: "engineer",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "bio", label: "Bio", kind: "textarea" },
      { key: "specialties", label: "Specialties, separated by commas", kind: "comma" },
    ],
    columns: [{ label: "Specialties", value: (r) => ((r.specialties as string[]) ?? []).join(", ") || "—" }],
  },
  packages: {
    title: "Packages",
    singular: "package",
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "hours", label: "Studio hours included", kind: "int" },
      { key: "price_pesewas", label: "Package price (GHS)", kind: "money" },
      { key: "room", label: "Room", kind: "room" },
      { key: "includes", label: "What's included, one per line", kind: "lines" },
    ],
    columns: [
      { label: "Hours", value: (r) => String(r.hours), align: "right" },
      { label: "Price", value: (r) => String(r.price_display), align: "right" },
    ],
  },
};

export default function AdminCataloguePage() {
  const [kind, setKind] = useState<CatalogueKind>("rooms");
  const [rows, setRows] = useState<Row[] | null | undefined>(undefined);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const isMobile = useIsMobile();
  const refresh = useCallback(() => setReload((n) => n + 1), []);
  const def = KINDS[kind];

  useEffect(() => {
    let live = true;
    adminApi
      .catalogue<Row>(kind)
      .then((p) => live && setRows(p.results))
      .catch(() => live && setRows(null));
    return () => {
      live = false;
    };
  }, [kind, reload]);

  useEffect(() => {
    adminApi
      .catalogue<AdminRoom>("rooms")
      .then((p) => setRooms(p.results))
      .catch(() => setRooms([]));
  }, [reload]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Studio & prices"
        description="What customers can book, and for how much. Price changes apply to new bookings only."
        actions={
          <Button className="h-11 md:h-9" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Add {def.singular}
          </Button>
        }
      />
      <Tabs value={kind} onValueChange={(k) => { setRows(undefined); setKind(k as CatalogueKind); }}>
        <TabsList aria-label="Catalogue" className="mb-4">
          {(Object.keys(KINDS) as CatalogueKind[]).map((k) => (
            <TabsTrigger key={k} value={k} className="min-h-11 px-3 md:min-h-8">
              {KINDS[k].title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {rows === null ? (
        <ErrorState message={`${def.title} could not be loaded.`} onRetry={refresh} />
      ) : rows === undefined ? (
        <RowsSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Store} title={`No ${def.title.toLowerCase()} yet`}
          action={<Button className="h-11" onClick={() => setEditing("new")}>Add {def.singular}</Button>} />
      ) : isMobile ? (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" data-testid="catalogue-row" onClick={() => setEditing(r)}
                className="w-full rounded-xl border border-border-default bg-surface p-4 text-left">
                <span className="flex items-center justify-between gap-2">
                  <b className="text-ink">{r.name}</b>
                  <StatusBadge active={r.is_active} />
                </span>
                <span className="mt-1 block text-[13.5px] text-ink-dim">
                  {def.columns.map((c) => `${c.label}: ${c.value(r)}`).join(" · ")}
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
                <TableHead className="pl-4">Name</TableHead>
                {def.columns.map((c) => (
                  <TableHead key={c.label} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>
                ))}
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-testid="catalogue-row" className="cursor-pointer" onClick={() => setEditing(r)}>
                  <TableCell className="pl-4">
                    <p className="font-bold text-ink">{r.name}</p>
                    {r.description ? <p className="line-clamp-1 max-w-md text-[13px] text-ink-mute">{String(r.description)}</p> : null}
                  </TableCell>
                  {def.columns.map((c) => (
                    <TableCell key={c.label} className={`tabular-nums text-ink ${c.align === "right" ? "text-right" : ""}`}>{c.value(r)}</TableCell>
                  ))}
                  <TableCell className="pr-4"><StatusBadge active={r.is_active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        {editing !== null ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg [&>*]:min-w-0">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-black">
                {editing === "new" ? `Add a ${def.singular}` : `Edit ${editing.name}`}
              </DialogTitle>
              <DialogDescription>Changes appear on the public pages within a minute.</DialogDescription>
            </DialogHeader>
            <ItemForm
              key={`${kind}-${editing === "new" ? "new" : editing.id}`}
              kind={kind}
              def={def}
              existing={editing === "new" ? null : editing}
              rooms={rooms}
              onCancel={() => setEditing(null)}
              onDone={(message) => {
                setEditing(null);
                toast.success(message);
                refresh();
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? <Badge className="bg-ok-bg text-ok">On sale</Badge> : <Badge variant="outline">Hidden</Badge>;
}

function initialValue(f: FieldDef, existing: Row | null): string {
  const v = existing?.[f.key];
  if (v === undefined || v === null) return f.kind === "room" ? "any" : "";
  if (f.kind === "money") return pesewasToInput(v as number);
  if (f.kind === "comma") return (v as string[]).join(", ");
  if (f.kind === "lines") return (v as string[]).join("\n");
  return String(v);
}

function ItemForm({
  kind,
  def,
  existing,
  rooms,
  onCancel,
  onDone,
}: {
  kind: CatalogueKind;
  def: KindDef;
  existing: Row | null;
  rooms: AdminRoom[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.fields.map((f) => [f.key, initialValue(f, existing)])),
  );
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(existing?.sort_order ?? 100));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function payload(): Record<string, unknown> | null {
    const out: Record<string, unknown> = { is_active: active, sort_order: Number(sortOrder) || 100 };
    const errs: Record<string, string> = {};
    for (const f of def.fields) {
      const raw = values[f.key] ?? "";
      if (f.kind === "money") {
        const p = parseGhsToPesewas(raw);
        if (!p) errs[f.key] = "Enter an amount in cedis, e.g. 200 or 200.50.";
        else out[f.key] = p;
      } else if (f.kind === "int") {
        if (!/^\d+$/.test(raw.trim())) errs[f.key] = "Enter a whole number.";
        else out[f.key] = Number(raw);
      } else if (f.kind === "comma") out[f.key] = raw.split(",").map((s) => s.trim()).filter(Boolean);
      else if (f.kind === "lines") out[f.key] = raw.split("\n").map((s) => s.trim()).filter(Boolean);
      else if (f.kind === "room") out[f.key] = raw === "any" ? null : raw;
      else out[f.key] = raw.trim();
    }
    setErrors(errs);
    return Object.keys(errs).length ? null : out;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const body = payload();
    if (!body) return;
    setBusy(true);
    try {
      if (existing) await adminApi.updateCatalogue(kind, existing.id, body);
      else await adminApi.createCatalogue(kind, body);
      onDone(existing ? `${String(body.name)} saved.` : `${String(body.name)} added.`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) fe[k] = v[0];
        setErrors(fe);
        setFormError(Object.keys(fe).length ? null : err.formError);
      } else setFormError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await adminApi.removeCatalogue(kind, existing.id);
      onDone(`${existing.name} removed.`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.formError : "Could not remove it.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-3">
      {def.fields.map((f) => {
        const id = `cat-${f.key}`;
        const err = errors[f.key];
        return (
          <div key={f.key} className="grid gap-1.5">
            <Label htmlFor={id}>{f.label}</Label>
            {f.kind === "textarea" || f.kind === "lines" ? (
              <Textarea id={id} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} aria-invalid={Boolean(err)} />
            ) : f.kind === "room" ? (
              <Select value={values[f.key]} onValueChange={(v) => setValues({ ...values, [f.key]: v })}>
                <SelectTrigger id={id} className="h-11 w-full md:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any room</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id={id} value={values[f.key]} inputMode={f.kind === "money" ? "decimal" : f.kind === "int" ? "numeric" : undefined}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} aria-invalid={Boolean(err)} className="h-11 md:h-9" />
            )}
            {err ? <p className="text-[13px] text-err">{err}</p> : f.hint ? <p className="text-[12.5px] text-ink-mute">{f.hint}</p> : null}
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="flex min-h-11 items-center gap-2 text-[14px] text-ink">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-ona-red" />
          On sale — customers can see and book it
        </label>
        <div className="grid w-24 gap-1.5">
          <Label htmlFor="cat-sort">Order</Label>
          <Input id="cat-sort" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-11 md:h-9" />
        </div>
      </div>
      <FormError message={formError} />
      <DialogFooter className="sm:justify-between">
        {existing ? (
          confirmRemove ? (
            <Button type="button" className="h-11 bg-err text-white hover:bg-err/90" disabled={busy} onClick={() => void remove()}>
              Yes, remove {existing.name}
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="h-11 text-err" disabled={busy} onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          )
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="h-11" disabled={busy}>{busy ? "Saving…" : existing ? "Save" : `Add ${def.singular}`}</Button>
        </span>
      </DialogFooter>
    </form>
  );
}
