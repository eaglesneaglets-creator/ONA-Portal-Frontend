"use client";

import { CalendarPlus, TriangleAlert, UserRound, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CustomerPicker } from "@/components/admin/customer-picker";
import { FormError } from "@/components/auth/fields";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, type Professional, type StaffCustomer } from "@/lib/api/admin";
import { fetchCatalogueFromBrowser, studioDate } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/errors";
import type { Engineer, Room, Service } from "@/lib/api/studio";
import { parseGhsToPesewas } from "@/lib/money";

/**
 * /admin/bookings/new — book a session on a customer's behalf (Task 15).
 *
 * For a phone call or a walk-in. The customer is an existing account or a
 * new one (they get an email to choose a password). Staff skip the pending
 * cap and the 90-day horizon; a session outside opening hours needs a
 * deliberate tick; the past and double-bookings are refused for everyone.
 * The API is the judge of all of it — this form explains its answers.
 */

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const LENGTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type Errors = Record<string, string>;

function collect(err: unknown): { form: string | null; fields: Errors } {
  if (!(err instanceof ApiError)) return { form: "Something went wrong. Please try again.", fields: {} };
  const fields: Errors = {};
  for (const [k, v] of Object.entries(err.fieldErrors)) fields[k] = v[0];
  // DRF nests the new customer's errors one level down.
  const nested = (err.detail as Record<string, unknown> | null)?.new_customer;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length) fields[`new_${k}`] = String(v[0]);
    }
  }
  const anyField = Object.keys(fields).length > 0;
  return { form: anyField ? null : err.formError, fields };
}

export default function NewBookingPage() {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState<{ rooms: Room[]; engineers: Engineer[]; services: Service[] } | null>(null);
  const [pros, setPros] = useState<Professional[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  // Customer
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customer, setCustomer] = useState<StaffCustomer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  // Session
  const [room, setRoom] = useState("");
  const [engineer, setEngineer] = useState("");
  const [service, setService] = useState("");
  const [day, setDay] = useState(() => studioDate(new Date(Date.now() + 86_400_000)));
  const [hour, setHour] = useState("10");
  const [length, setLength] = useState("2");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");
  const [notes, setNotes] = useState("");

  // Professional
  const [pro, setPro] = useState("none");
  const [fee, setFee] = useState("");

  const [outsideOk, setOutsideOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    fetchCatalogueFromBrowser()
      .then((c) => {
        setCatalogue(c);
        if (c.rooms[0]) setRoom(c.rooms[0].id);
        if (c.engineers[0]) setEngineer(c.engineers[0].id);
        if (c.services[0]) setService(c.services[0].id);
      })
      .catch(() => setLoadFailed(true));
    adminApi
      .professionals({ is_active: true, page_size: 100 })
      .then((p) => setPros(p.results))
      .catch(() => setPros([]));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const local: Errors = {};
    if (mode === "existing" && !customer) local.customer = "Find and choose the customer.";
    let feePesewas = 0;
    if (pro !== "none" && fee.trim()) {
      const parsed = parseGhsToPesewas(fee);
      if (parsed === null) local.professional_fee_pesewas = "Enter the fee in cedis, e.g. 150 or 150.50.";
      else feePesewas = parsed;
    }
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setBusy(true);
    try {
      const created = await adminApi.createBooking({
        ...(mode === "existing"
          ? { customer: customer!.id }
          : {
              new_customer: {
                first_name: newCustomer.first_name.trim(),
                last_name: newCustomer.last_name.trim(),
                email: newCustomer.email.trim(),
                phone: newCustomer.phone.trim(),
              },
            }),
        room,
        engineer,
        service,
        // Accra is UTC+0 all year (no daylight saving), so the studio's
        // wall-clock hour is the UTC hour.
        start_at: `${day}T${hour.padStart(2, "0")}:00:00+00:00`,
        hours: Number(length),
        notes: notes.trim(),
        status,
        professional: pro === "none" ? null : pro,
        professional_fee_pesewas: feePesewas,
        allow_outside_hours: outsideOk,
      });
      toast.success(
        `${created.reference} booked for ${created.customer.name}.` +
          (mode === "new" ? " They have been emailed to set a password." : " They have been emailed."),
      );
      router.push(`/admin/bookings?when=all&q=${encodeURIComponent(created.reference)}`);
    } catch (err) {
      const { form, fields } = collect(err);
      setFormError(form);
      setErrors(fields);
      setBusy(false);
    }
  }

  const selectedRoom = catalogue?.rooms.find((r) => r.id === room);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="New booking"
        description="Book a session for a customer who called or walked in. Times are Accra time."
        actions={
          <Button asChild variant="outline" className="h-11 md:h-9">
            <Link href="/admin/bookings">Back to bookings</Link>
          </Button>
        }
      />

      {loadFailed ? (
        <p role="alert" className="mb-4 rounded-md bg-warn-bg px-4 py-3 text-[14px] text-warn">
          Rooms and engineers could not be loaded. Refresh the page to try again.
        </p>
      ) : null}

      <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[17px] font-black">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
                <TabsList aria-label="Customer" className="mb-4">
                  <TabsTrigger value="existing" className="min-h-11 px-3 md:min-h-8">
                    <UserRound aria-hidden="true" /> Existing customer
                  </TabsTrigger>
                  <TabsTrigger value="new" className="min-h-11 px-3 md:min-h-8">
                    <UserRoundPlus aria-hidden="true" /> New customer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existing">
                  <CustomerPicker id="customer-search" value={customer} onChange={setCustomer} error={errors.customer} />
                  {!customer ? (
                    <p className="mt-2 text-[13px] text-ink-mute">
                      Not here yet? Use <b>New customer</b> to add them.
                    </p>
                  ) : null}
                </TabsContent>

                <TabsContent value="new">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField id="nc-first" label="First name" value={newCustomer.first_name} error={errors.new_first_name}
                      onChange={(v) => setNewCustomer({ ...newCustomer, first_name: v })} autoComplete="off" />
                    <TextField id="nc-last" label="Last name" value={newCustomer.last_name} error={errors.new_last_name}
                      onChange={(v) => setNewCustomer({ ...newCustomer, last_name: v })} autoComplete="off" />
                    <TextField id="nc-email" label="Email" type="email" value={newCustomer.email} error={errors.new_email ?? errors.new_customer}
                      onChange={(v) => setNewCustomer({ ...newCustomer, email: v })} autoComplete="off" />
                    <TextField id="nc-phone" label="Phone (optional)" type="tel" value={newCustomer.phone} error={errors.new_phone}
                      onChange={(v) => setNewCustomer({ ...newCustomer, phone: v })} autoComplete="off" />
                  </div>
                  <p className="mt-3 text-[13px] text-ink-mute">
                    They get an email to choose a password, then see this booking in their dashboard.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[17px] font-black">Session</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <PickField id="room" label="Room" value={room} onChange={setRoom}
                options={(catalogue?.rooms ?? []).map((r) => ({ value: r.id, label: `${r.name} · ${r.hourly_rate_display}/hr` }))} />
              <PickField id="engineer" label="Engineer" value={engineer} onChange={setEngineer}
                options={(catalogue?.engineers ?? []).map((e) => ({ value: e.id, label: e.name }))} />
              <PickField id="service" label="Service" value={service} onChange={setService}
                options={(catalogue?.services ?? []).map((s) => ({ value: s.id, label: s.name }))} />
              <div className="grid gap-1.5">
                <Label htmlFor="day">Date</Label>
                <Input id="day" type="date" value={day} min={studioDate(new Date())} onChange={(e) => setDay(e.target.value)}
                  className="h-11 md:h-9" aria-invalid={Boolean(errors.start_at)} />
              </div>
              <PickField id="hour" label="Starts at" value={hour} onChange={(v) => { setHour(v); setOutsideOk(false); }}
                options={HOURS.map((h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }))} />
              <PickField id="length" label="Length" value={length} onChange={(v) => { setLength(v); setOutsideOk(false); }}
                options={LENGTHS.map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "hour" : "hours"}` }))} />
              {errors.start_at || errors.hours ? (
                <p role="alert" className="text-[13.5px] text-err sm:col-span-2">{errors.start_at ?? errors.hours}</p>
              ) : null}

              {errors.outside_hours ? (
                <Alert className="border-warn/30 bg-warn-bg sm:col-span-2">
                  <TriangleAlert aria-hidden="true" className="text-warn" />
                  <AlertDescription className="text-warn">
                    <p className="mb-2">{errors.outside_hours}</p>
                    <label className="flex min-h-11 items-center gap-2 font-bold text-ink">
                      <input type="checkbox" checked={outsideOk} onChange={(e) => setOutsideOk(e.target.checked)} className="size-4 accent-ona-red" />
                      Book outside opening hours anyway
                    </label>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes for the engineer (the customer sees these)</Label>
                <Textarea id="notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[17px] font-black">Professional (optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <PickField id="pro" label="Session professional" value={pro} onChange={setPro}
                options={[{ value: "none", label: "No professional" },
                  ...pros.map((p) => ({ value: p.id, label: `${p.stage_name ? `${p.stage_name} (${p.name})` : p.name} · ${p.rate_display}` }))]} />
              {pro !== "none" ? (
                <TextField id="fee" label="Fee to the customer (GHS)" value={fee} onChange={setFee} inputMode="decimal"
                  placeholder="e.g. 300" error={errors.professional_fee_pesewas} />
              ) : null}
              <p className="text-[13px] text-ink-mute sm:col-span-2">
                The fee is added to the total and to the invoice as its own line. The customer sees the
                professional&apos;s stage name only. <Link href="/admin/professionals" className="font-bold text-info hover:underline">Manage professionals</Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary + submit */}
        <aside aria-label="Booking summary" className="lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-[17px] font-black">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <dl className="grid gap-1.5 text-[14px]">
                <SummaryRow label="Customer" value={mode === "existing" ? customer?.name ?? "—" : newCustomer.first_name || "New customer"} />
                <SummaryRow label="Room" value={selectedRoom?.name ?? "—"} />
                <SummaryRow label="When" value={`${day} · ${hour.padStart(2, "0")}:00 · ${length}h`} />
                <SummaryRow label="Rate" value={selectedRoom ? `${selectedRoom.hourly_rate_display}/hr` : "—"} />
              </dl>
              <p className="text-[12.5px] text-ink-mute">The total, invoice and reference are created by the server when you book.</p>
              <PickField id="status" label="Start as" value={status} onChange={(v) => setStatus(v as "pending" | "confirmed")}
                options={[{ value: "confirmed", label: "Confirmed — agreed with the customer" }, { value: "pending", label: "Pending — still to confirm" }]} />
              <FormError message={formError} />
              <Button type="submit" disabled={busy || !catalogue} className="h-12 w-full text-[15px] font-bold">
                <CalendarPlus aria-hidden="true" />
                {busy ? "Booking…" : "Book session"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function TextField({
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
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined} className="h-11 md:h-9" {...rest} />
      {error ? <p id={`${id}-err`} className="text-[13px] text-err">{error}</p> : null}
    </div>
  );
}

function PickField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full md:h-9">
          <SelectValue placeholder="Loading…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="truncate text-right font-bold text-ink">{value}</dd>
    </div>
  );
}
