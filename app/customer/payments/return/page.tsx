"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { type PaymentOutcome, verifyPayment } from "@/lib/api/bookings";

/**
 * /customer/payments/return?reference=… — where Paystack sends the customer
 * after checkout (ADR-018).
 *
 * Visiting this page proves nothing: the server asks Paystack, and only its
 * answer counts. A Mobile Money approval can take a little while to land,
 * so a "pending" answer is asked again a few times before the page settles
 * on "we'll email you".
 */
const ATTEMPTS = 6;
const EVERY_MS = 3_000;

function PaymentReturn() {
  const params = useSearchParams();
  // Paystack appends both; they carry the same value.
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const [error, setError] = useState<string | null>(reference ? null : "This link is missing its payment reference.");
  const [settled, setSettled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function ask(attempt: number) {
      try {
        const o = await verifyPayment(reference);
        if (cancelled) return;
        setOutcome(o);
        if (o.status === "pending" && attempt < ATTEMPTS) {
          timer = setTimeout(() => void ask(attempt + 1), EVERY_MS);
        } else {
          setSettled(true);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.formError : "We could not check this payment just now.");
        setSettled(true);
      }
    }
    void ask(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference]);

  useEffect(() => {
    if (settled) heading.current?.focus();
  }, [settled]);

  const view = error
    ? { tone: "err" as const, title: "We could not find this payment", body: error }
    : !outcome || (outcome.status === "pending" && !settled)
      ? { tone: "wait" as const, title: "Confirming your payment…", body: "This usually takes a few seconds. Please keep this page open." }
      : outcome.status === "succeeded"
        ? {
            tone: "ok" as const,
            title: outcome.booking.status === "confirmed" ? "Paid — your session is confirmed" : "Payment received",
            body: `We received ${outcome.amount_display} for booking ${outcome.booking.reference}. Your receipt is on its way by email.`,
          }
        : outcome.status === "failed"
          ? {
              tone: "err" as const,
              title: "The payment did not go through",
              body: `${outcome.failure_reason || "It was declined."} No money was taken — you can try again from your bookings.`,
            }
          : {
              tone: "wait" as const,
              title: "Still confirming",
              body: "Paystack has not confirmed this payment yet. If money left your account, it will show on your booking shortly — we will email you. Please do not pay twice.",
            };

  const Icon = view.tone === "ok" ? CheckCircle2 : view.tone === "err" ? CircleAlert : LoaderCircle;
  const iconTone =
    view.tone === "ok" ? "bg-ok-bg text-ok" : view.tone === "err" ? "bg-err-bg text-err" : "bg-surface-alt text-ona-blue";

  return (
    <div className="mx-auto max-w-xl py-6">
      <Card className="text-center">
        <CardContent className="py-8" role="status" aria-live="polite">
          <span aria-hidden="true" className={`mx-auto mb-4 grid size-14 place-items-center rounded-pill ${iconTone}`}>
            <Icon className={`size-8 ${view.tone === "wait" && !settled ? "animate-spin" : ""}`} />
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mb-3 text-[clamp(22px,4vw,30px)] font-black leading-[1.15] tracking-tight text-ink outline-none"
          >
            {view.title}
          </h1>
          <p className="mb-6 text-[15.5px] leading-relaxed text-ink-dim">{view.body}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="h-11 px-6 font-bold">
              <Link href="/customer/bookings">Your bookings</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 font-bold">
              <Link href="/customer">Workspace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}
