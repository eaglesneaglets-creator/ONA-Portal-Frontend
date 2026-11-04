"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { type Booking, type PaymentOption, isPaystackCheckout, startCheckout } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";

type Payable = Pick<Booking, "id" | "can_pay_online" | "payment_options">;

/**
 * Paying for a booking on ONA's terms (ADR-018): a 50% deposit secures it,
 * or pay in full; once the deposit is in, the balance. Paystack's processing
 * fee is added and itemised BEFORE the customer leaves for Paystack — ONA's
 * "a full itemized breakdown will be displayed before you complete your
 * booking". The figures are the server's; nothing is computed here.
 *
 * Renders nothing unless the server says the booking can be paid online.
 */
function usePay(bookingId: string) {
  const [busy, setBusy] = useState<PaymentOption["kind"] | null>(null);

  async function pay(kind: PaymentOption["kind"]) {
    setBusy(kind);
    try {
      // "balance" is what the server offers once the deposit is paid; asking
      // for "full" then charges exactly that.
      const { authorization_url } = await startCheckout(bookingId, kind === "deposit" ? "deposit" : "full");
      if (!isPaystackCheckout(authorization_url)) throw new Error("unexpected checkout url");
      // A full navigation: Paystack is another site, and Back must return here.
      window.location.assign(authorization_url);
    } catch (err) {
      setBusy(null);
      toast.error(err instanceof ApiError ? err.formError : "Could not start the payment. Please try again.");
    }
  }
  return { busy, pay };
}

/** The full choice, with the fee broken out. For the confirmation and detail views. */
export function PayOptions({ booking, className }: { booking: Payable; className?: string }) {
  const { busy, pay } = usePay(booking.id);
  if (!booking.can_pay_online || booking.payment_options.length === 0) return null;

  return (
    <div className={cn("space-y-3 text-left", className)}>
      {booking.payment_options.map((o, i) => (
        <div key={o.kind} className="rounded-xl border border-border-default bg-surface p-3">
          <Button
            type="button"
            variant={i === 0 ? "default" : "outline"}
            onClick={() => void pay(o.kind)}
            disabled={busy !== null}
            aria-busy={busy === o.kind}
            className="h-11 w-full font-bold"
          >
            {busy === o.kind ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CreditCard aria-hidden="true" />}
            {busy === o.kind ? "Opening checkout…" : `${labelFor(o)} · ${o.charge_display}`}
          </Button>
          <p className="mt-2 text-center text-[12.5px] text-ink-mute" data-testid={`pay-breakdown-${o.kind}`}>
            {o.amount_display}
            {o.fee_pesewas ? ` + ${o.fee_display} Paystack processing fee` : ""}
          </p>
        </div>
      ))}
      <p className="text-center text-[12px] text-ink-mute">
        Mobile Money on Paystack&rsquo;s secure checkout. By paying you agree to ONA&rsquo;s{" "}
        <Link href="/legal/terms" className="font-bold text-ink-dim underline">
          booking terms
        </Link>
        : deposits are not refunded; with 48 hours&rsquo; notice they carry over to a new date.
      </p>
    </div>
  );
}

/** One compact action — the first option — for a table row or a card. */
export function PayButton({ booking, className, compact }: { booking: Payable; className?: string; compact?: boolean }) {
  const { busy, pay } = usePay(booking.id);
  const first = booking.payment_options[0];
  if (!booking.can_pay_online || !first) return null;

  return (
    <Button
      type="button"
      onClick={() => void pay(first.kind)}
      disabled={busy !== null}
      aria-busy={busy !== null}
      size={compact ? "sm" : "default"}
      title={first.fee_pesewas ? `${first.amount_display} + ${first.fee_display} Paystack fee` : undefined}
      className={cn("font-bold", compact ? "h-11 md:h-8" : "h-11 px-6", className)}
    >
      {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CreditCard aria-hidden="true" />}
      {busy ? "Opening checkout…" : `${labelFor(first)} ${first.charge_display}`}
    </Button>
  );
}

function labelFor(o: PaymentOption): string {
  return o.kind === "deposit" ? "Pay deposit" : o.kind === "balance" ? "Pay balance" : "Pay in full";
}
