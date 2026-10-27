"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { type Booking, isPaystackCheckout, startCheckout } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";

/**
 * "Pay GHS 400.00" — starts a Paystack checkout and leaves for it (ADR-018).
 *
 * Renders nothing unless the server says this booking can be paid online,
 * so it is safe to drop anywhere a booking is shown. Paystack's page offers
 * whatever ONA has switched on: card and the Ghana Mobile Money networks.
 */
export function PayButton({
  booking,
  className,
  compact,
}: {
  booking: Pick<Booking, "id" | "can_pay_online" | "outstanding_display">;
  className?: string;
  /** Table rows: a smaller button. Still 44px tall on phones. */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (!booking.can_pay_online) return null;

  async function pay() {
    setBusy(true);
    try {
      const { authorization_url } = await startCheckout(booking.id);
      if (!isPaystackCheckout(authorization_url)) throw new Error("unexpected checkout url");
      // A full navigation, not router.push: Paystack is another site, and
      // the customer must be able to use Back to return here.
      window.location.assign(authorization_url);
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof ApiError ? err.formError : "Could not start the payment. Please try again.");
    }
  }

  return (
    <Button
      type="button"
      onClick={() => void pay()}
      disabled={busy}
      aria-busy={busy}
      size={compact ? "sm" : "default"}
      className={cn("font-bold", compact ? "h-11 md:h-8" : "h-11 px-6", className)}
    >
      {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <CreditCard aria-hidden="true" />}
      {busy ? "Opening checkout…" : `Pay ${booking.outstanding_display}`}
    </Button>
  );
}
