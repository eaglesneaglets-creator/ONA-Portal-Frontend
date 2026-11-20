"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useFocusFirstError } from "@/hooks/use-focus-first-error";
import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type BusinessSettings, type TaxLine, businessApi, holdText, percentText } from "@/lib/api/business";
import type { FieldErrors } from "@/lib/api/errors";
import { showSaveError } from "@/lib/forms";
import { previewGhs as formatGhs } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";

/**
 * /admin/business — ONA's business rules, shadcn's settings layout: a section
 * menu, one card per concern, each card saving only its own fields. Until the
 * first save the environment defaults are in force (shown as a badge).
 */

type Key = keyof BusinessSettings;

const SECTIONS: { id: string; title: string; description: string; keys: Key[] }[] = [
  { id: "bookings", title: "Bookings and payment", description: "How much secures a booking, and how long an unpaid booking keeps its slot.",
    keys: ["booking_deposit_percent", "unpaid_hold_minutes", "max_open_unpaid"] },
  { id: "changes", title: "Changes and cancellations", description: "How much notice a customer must give, and how long a carried-over deposit stays valid.",
    keys: ["free_cancellation_hours", "deposit_credit_days"] },
  { id: "hours", title: "Studio hours and reminders", description: "When sessions can be booked, and when the reminder email goes out.",
    keys: ["studio_open_hour", "studio_close_hour", "reminder_hours_before"] },
  { id: "fees", title: "Fees and commission", description: "Paystack's processing fee, and ONA's commission on each kind of work.",
    keys: ["pass_paystack_fee", "paystack_fee_basis_points", "studio_commission_percent", "marketplace_commission_percent"] },
  { id: "tax", title: "Tax", description: "Prices include tax: customers pay the same, and invoices show what the total is made of.",
    keys: ["tax_enabled", "taxes"] },
  { id: "invoices", title: "Invoice details", description: "Printed on every invoice and receipt.",
    keys: ["invoice_business_name", "invoice_address", "invoice_tin", "invoice_contact", "invoice_bank_details"] },
];

export default function BusinessSettingsPage() {
  const [saved, setSaved] = useState<BusinessSettings | null | undefined>(undefined);
  const [form, setForm] = useState<BusinessSettings | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  // Several forms here (one per section), so each failure names its form.
  const { focusFirstError } = useFocusFirstError();

  useEffect(() => {
    let live = true;
    businessApi.get().then(
      (s) => { if (live) { setSaved(s); setForm(s); } },
      () => live && setSaved(null),
    );
    return () => { live = false; };
  }, [reload]);

  function set<K extends Key>(key: K, value: BusinessSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  const dirty = (keys: Key[]) =>
    !!form && !!saved && keys.some((k) => JSON.stringify(form[k]) !== JSON.stringify(saved[k]));

  async function save(section: (typeof SECTIONS)[number], formEl?: HTMLFormElement) {
    if (!form) return;
    const body = Object.fromEntries(section.keys.map((k) => [k, form[k]])) as Partial<BusinessSettings>;
    setBusy(section.id);
    try {
      const next = await businessApi.update(body);
      setSaved(next);
      setForm((f) => (f ? { ...f, ...Object.fromEntries(section.keys.map((k) => [k, next[k]])) } : next));
      toast.success(`${section.title} saved. It applies within a minute.`);
    } catch (err) {
      showSaveError(err, setErrors, () => focusFirstError(formEl), "Could not save. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function undo(section: (typeof SECTIONS)[number]) {
    if (!saved) return;
    setForm((f) => (f ? { ...f, ...Object.fromEntries(section.keys.map((k) => [k, saved[k]])) } : f));
    setErrors({});
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Business settings"
        description={
          saved?.saved && saved.updated_at
            ? `Last changed ${new Date(saved.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}${saved.updated_by ? ` by ${saved.updated_by}` : ""}.`
            : "The rules the site, invoices and payments follow."
        }
        actions={saved && !saved.saved ? <Badge variant="outline" className="h-8 px-3">Using the default values</Badge> : undefined}
      />

      {saved === null ? (
        <ErrorState message="Business settings could not be loaded." onRetry={() => setReload((n) => n + 1)} />
      ) : saved === undefined || !form ? (
        <RowsSkeleton rows={5} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
            <ul className="flex gap-2 lg:sticky lg:top-6 lg:flex-col lg:gap-1">
              {SECTIONS.map((s) => (
                <li key={s.id} className="flex-none">
                  <a href={`#${s.id}`}
                    className={cn("flex min-h-11 items-center gap-2 rounded-lg px-3 text-[14px] font-semibold whitespace-nowrap lg:min-h-9",
                      "border border-border-default bg-surface text-ink-dim hover:text-ink lg:border-transparent lg:bg-transparent lg:hover:bg-surface-sunk")}>
                    {s.title}
                    {dirty(s.keys) ? <span className="size-1.5 rounded-full bg-ona-red" aria-label="unsaved changes" /> : null}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid min-w-0 gap-6">
            {SECTIONS.map((s) => (
              <Card key={s.id} id={s.id} className="scroll-mt-24">
                <form onSubmit={(e) => { e.preventDefault(); void save(s, e.currentTarget); }} noValidate>
                  <CardHeader>
                    <CardTitle className="text-[18px] font-black">{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 pt-2">
                    <SectionFields id={s.id} form={form} set={set} errors={errors} />
                  </CardContent>
                  <CardFooter className="mt-2 justify-end gap-3 border-t border-border-soft pt-4">
                    {dirty(s.keys) ? (
                      <Button type="button" variant="ghost" className="h-11 md:h-9" disabled={busy !== null} onClick={() => undo(s)}>
                        Undo
                      </Button>
                    ) : null}
                    <Button type="submit" className="h-11 md:h-9" disabled={busy !== null || !dirty(s.keys)}>
                      {busy === s.id ? "Saving…" : "Save"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Fields ────────────────────────────────────────────────────────────── */

type SetFn = <K extends Key>(key: K, value: BusinessSettings[K]) => void;

function NumberField({ id, label, value, onChange, suffix, hint, error, min, max, step = 1 }: {
  id: string; label: string; value: number; onChange: (n: number) => void; suffix?: string;
  hint?: React.ReactNode; error?: string; min?: number; max?: number; step?: number;
}) {
  // The typed text, so "1." or an empty box can be mid-edit; re-synced when the
  // saved value changes underneath (Undo, a save), React's "adjust state on prop change".
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (Number(text) !== value) setText(String(value));
  }
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={text}
          aria-invalid={Boolean(error)} aria-describedby={`${id}-hint`}
          className="h-11 w-32 tabular-nums md:h-9"
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }} />
        {suffix ? <span className="text-[14px] text-ink-dim">{suffix}</span> : null}
      </div>
      <p id={`${id}-hint`} className={cn("text-[13px]", error ? "text-err" : "text-ink-mute")}>{error ?? hint}</p>
    </div>
  );
}

function TextInput({ id, label, value, onChange, hint, error, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string; placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)} className="h-11 md:h-9" />
      {error || hint ? <p className={cn("text-[13px]", error ? "text-err" : "text-ink-mute")}>{error ?? hint}</p> : null}
    </div>
  );
}

function SwitchRow({ id, label, description, checked, onChange }: {
  id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border-default p-4">
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-[14.5px] font-semibold">{label}</Label>
        <p className="text-[13px] text-ink-mute">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function HourSelect({ id, label, value, from, to, onChange, error }: {
  id: string; label: string; value: number; from: number; to: number; onChange: (h: number) => void; error?: string;
}) {
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id} className="h-11 w-36 md:h-9" aria-invalid={Boolean(error)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)}>{h === 24 ? "24:00 (midnight)" : hourLabel(h)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-[13px] text-err">{error}</p> : null}
    </div>
  );
}

function SectionFields({ id, form, set, errors }: { id: string; form: BusinessSettings; set: SetFn; errors: FieldErrors }) {
  const err = (k: Key) => errors[k]?.[0];
  switch (id) {
    case "bookings":
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField id="deposit" label="Deposit" suffix="% of the total" min={1} max={100}
            value={form.booking_deposit_percent} onChange={(n) => set("booking_deposit_percent", n)}
            error={err("booking_deposit_percent")} hint="Paid to secure a booking." />
          <NumberField id="hold" label="Hold an unpaid booking for" suffix="minutes" min={15} max={2880} step={15}
            value={form.unpaid_hold_minutes} onChange={(n) => set("unpaid_hold_minutes", n)}
            error={err("unpaid_hold_minutes")} hint={`= ${holdText(form.unpaid_hold_minutes)}, then the slot is freed.`} />
          <NumberField id="max-unpaid" label="Unpaid bookings per customer" suffix="at most" min={1} max={20}
            value={form.max_open_unpaid} onChange={(n) => set("max_open_unpaid", n)}
            error={err("max_open_unpaid")} hint="Stops one person holding many slots." />
        </div>
      );
    case "changes":
      return (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField id="notice" label="Notice to change or cancel" suffix="hours" min={0} max={720}
              value={form.free_cancellation_hours} onChange={(n) => set("free_cancellation_hours", n)}
              error={err("free_cancellation_hours")} hint="With less notice, the deposit is forfeit." />
            <NumberField id="credit" label="Carried-over deposit valid for" suffix="days" min={1} max={365}
              value={form.deposit_credit_days} onChange={(n) => set("deposit_credit_days", n)}
              error={err("deposit_credit_days")} hint="To book and complete a new session." />
          </div>
          <Alert className="border-warn/30 bg-warn-bg">
            <AlertTriangle aria-hidden="true" className="text-warn" />
            <AlertTitle className="text-warn">These are also written in the Booking terms</AlertTitle>
            <AlertDescription className="text-ink-dim">
              The site, emails and invoices follow what you save here, but the{" "}
              <Link href="/legal/terms" target="_blank" className="font-semibold text-ink underline underline-offset-4">Booking terms</Link>{" "}
              are ONA&rsquo;s legal wording and only change with a site update. Ask for the terms to be updated when you change these.
            </AlertDescription>
          </Alert>
        </>
      );
    case "hours":
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <HourSelect id="open" label="Opens" value={form.studio_open_hour} from={0} to={23}
            onChange={(h) => set("studio_open_hour", h)} error={err("studio_open_hour")} />
          <HourSelect id="close" label="Closes" value={form.studio_close_hour} from={1} to={24}
            onChange={(h) => set("studio_close_hour", h)} error={err("studio_close_hour")} />
          <NumberField id="reminder" label="Reminder email" suffix="hours before" min={1} max={168}
            value={form.reminder_hours_before} onChange={(n) => set("reminder_hours_before", n)}
            error={err("reminder_hours_before")} />
          <p className="text-[13px] text-ink-mute sm:col-span-3">
            {form.studio_open_hour === 0 && form.studio_close_hour === 24
              ? "Open round the clock: sessions can be booked at any hour."
              : `Sessions can be booked from ${hourLabel(form.studio_open_hour)} to ${hourLabel(form.studio_close_hour)}.`}
          </p>
        </div>
      );
    case "fees":
      return (
        <>
          <SwitchRow id="pass-fee" label="Customer pays the Paystack fee"
            description="Added on top at checkout and shown before they pay. Off: ONA absorbs it."
            checked={form.pass_paystack_fee} onChange={(v) => set("pass_paystack_fee", v)} />
          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField id="fee" label="Paystack fee" suffix="%" min={0} max={10} step={0.01}
              value={form.paystack_fee_basis_points / 100}
              onChange={(n) => set("paystack_fee_basis_points", Math.round(n * 100))}
              error={err("paystack_fee_basis_points")} hint="Paystack's rate for Mobile Money." />
            <NumberField id="studio-commission" label="Commission on studio sessions" suffix="%" min={0} max={100}
              value={form.studio_commission_percent} onChange={(n) => set("studio_commission_percent", n)}
              error={err("studio_commission_percent")} />
            <NumberField id="market-commission" label="Commission on professionals' work" suffix="%" min={0} max={100}
              value={form.marketplace_commission_percent} onChange={(n) => set("marketplace_commission_percent", n)}
              error={err("marketplace_commission_percent")} />
          </div>
          <p className="text-[13px] text-ink-mute">A rate change applies to new payments; each payment keeps the rate it was made with.</p>
        </>
      );
    case "tax":
      return <TaxFields form={form} set={set} errors={errors} />;
    case "invoices":
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput id="biz-name" label="Business name" value={form.invoice_business_name}
            onChange={(v) => set("invoice_business_name", v)} error={err("invoice_business_name")} />
          <TextInput id="tin" label="TIN" value={form.invoice_tin} placeholder="e.g. C0000000000"
            onChange={(v) => set("invoice_tin", v)} error={err("invoice_tin")} hint="Required on a tax invoice." />
          <TextInput id="address" label="Address" value={form.invoice_address}
            onChange={(v) => set("invoice_address", v)} error={err("invoice_address")} />
          <TextInput id="contact" label="Contact on invoices" value={form.invoice_contact}
            placeholder="Name · phone · email" onChange={(v) => set("invoice_contact", v)} error={err("invoice_contact")} />
          <div className="sm:col-span-2">
            <TextInput id="bank" label="Bank details for transfers" value={form.invoice_bank_details}
              placeholder="Bank · account name · account number" onChange={(v) => set("invoice_bank_details", v)}
              error={err("invoice_bank_details")} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

/** A percent box over basis points, synced like NumberField so Undo shows the saved rate. */
function RateInput({ label, basisPoints, onChange }: { label: string; basisPoints: number; onChange: (bp: number) => void }) {
  const [text, setText] = useState(basisPoints ? String(basisPoints / 100) : "");
  const [shown, setShown] = useState(basisPoints);
  if (basisPoints !== shown) {
    setShown(basisPoints);
    if (Math.round(Number(text) * 100) !== basisPoints) setText(basisPoints ? String(basisPoints / 100) : "");
  }
  return (
    <Input aria-label={label} type="number" inputMode="decimal" min={0.01} max={50} step={0.01} value={text}
      className="h-11 w-24 tabular-nums md:h-9"
      onChange={(e) => {
        setText(e.target.value);
        onChange(Math.round(Number(e.target.value || 0) * 100));
      }} />
  );
}

/** Mirrors core/business.py tax_breakdown: every rate on the amount before tax; remainder to it. */
function breakdown(total: number, taxes: TaxLine[]) {
  const bps = taxes.reduce((n, t) => n + (t.basis_points || 0), 0);
  const parts = taxes.map((t) => ({ ...t, amount: Math.floor((total * (t.basis_points || 0)) / (10_000 + bps)) }));
  return { net: total - parts.reduce((n, p) => n + p.amount, 0), parts };
}

const EXAMPLE_TOTAL = 100_000; // GHS 1,000.00

function TaxFields({ form, set, errors }: { form: BusinessSettings; set: SetFn; errors: FieldErrors }) {
  const taxes = form.taxes;
  const example = useMemo(() => breakdown(EXAMPLE_TOTAL, taxes), [taxes]);
  const update = (i: number, patch: Partial<TaxLine>) =>
    set("taxes", taxes.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <>
      <SwitchRow id="tax-on" label="Charge tax"
        description="Turn on once ONA is registered. Applies to bookings made from then on; issued invoices never change."
        checked={form.tax_enabled} onChange={(v) => set("tax_enabled", v)} />
      <div className="grid gap-3">
        <Label>Tax lines</Label>
        {taxes.length === 0 ? (
          <p className="text-[13.5px] text-ink-mute">No taxes yet. Add each one ONA charges, e.g. VAT, NHIL and GETFund, with the rate from ONA&rsquo;s accountant.</p>
        ) : (
          <ul className="grid gap-2">
            {taxes.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <Input aria-label={`Tax ${i + 1} name`} value={t.name} placeholder="Name, e.g. VAT"
                  className="h-11 min-w-0 flex-1 md:h-9" onChange={(e) => update(i, { name: e.target.value })} />
                <RateInput label={`Tax ${i + 1} rate`} basisPoints={t.basis_points}
                  onChange={(bp) => update(i, { basis_points: bp })} />
                <span className="text-[14px] text-ink-dim">%</span>
                <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9"
                  aria-label={`Remove ${t.name || `tax ${i + 1}`}`} onClick={() => set("taxes", taxes.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {errors.taxes?.length ? <p className="text-[13px] text-err">{errors.taxes[0]}</p> : null}
        <div>
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={taxes.length >= 6}
            onClick={() => set("taxes", [...taxes, { name: "", basis_points: 0 }])}>
            <Plus aria-hidden="true" />
            Add tax
          </Button>
        </div>
      </div>
      {taxes.length ? (
        <div className="rounded-lg bg-surface-alt p-4 text-[13.5px]">
          <p className="mb-2 font-semibold text-ink">On a {formatGhs(EXAMPLE_TOTAL)} booking, the invoice shows:</p>
          <dl className="grid gap-1 tabular-nums">
            <div className="flex justify-between"><dt className="text-ink-dim">Amount before tax</dt><dd>{formatGhs(example.net)}</dd></div>
            {example.parts.map((p, i) => (
              <div key={i} className="flex justify-between">
                <dt className="text-ink-dim">{p.name || "Unnamed tax"} ({percentText(p.basis_points || 0)})</dt>
                <dd>{formatGhs(p.amount)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-border-soft pt-1 font-semibold">
              <dt>Total (what the customer pays)</dt><dd>{formatGhs(EXAMPLE_TOTAL)}</dd>
            </div>
          </dl>
          {!form.tax_enabled ? <p className="mt-2 text-ink-mute">Tax is off: invoices do not show this yet.</p> : null}
        </div>
      ) : null}
    </>
  );
}
