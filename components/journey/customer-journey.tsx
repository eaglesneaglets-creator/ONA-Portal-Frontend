"use client";

import { ArrowRight, MailCheck, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Celebrate } from "@/components/journey/celebrate";
import { IllusCalendar, IllusDeposit, IllusEnvelope, IllusPhone, IllusSession } from "@/components/journey/illustrations";
import { SetupGuide, type GuideItem } from "@/components/journey/setup-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { fetchJourney, resendVerification, savePhone, setJourneyHidden, type Journey, type JourneyStep } from "@/lib/api/journey";
import { useAuthStore } from "@/lib/auth/store";

/**
 * "Get started" — the customer journey from signing up to their first
 * session (backend: apps/accounts/journey.py), on the shared setup guide.
 *
 * Steps tick themselves off from real records, wherever the thing happened
 * (online, at the desk, by phone). The next one is open with the action that
 * moves it on — sending the email link again or saving a phone number happen
 * right here; booking and paying link to where they are done. Finishing the
 * last step is celebrated once.
 *
 * `onLoaded` lets the page decide what else to show (the email banner) from
 * the same fetch.
 */
const ILLUSTRATION: Partial<Record<JourneyStep["key"], React.ReactNode>> = {
  verify_email: <IllusEnvelope />,
  phone: <IllusPhone />,
  first_booking: <IllusCalendar />,
  deposit: <IllusDeposit />,
  first_session: <IllusSession />,
};

export function CustomerJourney({ onLoaded }: { onLoaded?: (j: Journey | null) => void }) {
  const [journey, setJourney] = useState<Journey | null | undefined>(undefined);
  const [celebrate, setCelebrate] = useState(false);
  const firstName = useAuthStore((s) => s.user?.first_name);
  const wasComplete = useRef<boolean | null>(null);

  function take(j: Journey | null) {
    setJourney(j);
    onLoaded?.(j);
    if (j) {
      // Celebrate the moment it completes, not every visit afterwards.
      if (wasComplete.current === false && j.complete) setCelebrate(true);
      wasComplete.current = j.complete;
    }
  }

  useEffect(() => {
    let live = true;
    fetchJourney()
      .then((j) => live && take(j))
      .catch(() => live && take(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);

  async function refresh() {
    try {
      take(await fetchJourney());
    } catch {
      /* keep what is shown */
    }
  }

  async function hide(hidden: boolean) {
    try {
      take(await setJourneyHidden(hidden));
      if (hidden) toast("Guide hidden. You can bring it back from the bottom of this page.");
    } catch {
      toast.error("That did not save. Please try again.");
    }
  }

  if (!journey) return null;
  if (journey.dismissed) {
    return journey.complete ? null : (
      <p className="mt-8 text-center text-[13px] text-ink-mute" data-testid="journey-restore">
        <button type="button" className="min-h-11 font-bold text-ona-blue underline-offset-2 hover:underline" onClick={() => void hide(false)}>
          Show the getting-started guide
        </button>
      </p>
    );
  }

  const items: GuideItem[] = journey.steps.map((s) => ({
    key: s.key,
    title: s.title,
    body: s.body,
    done: s.done,
    urgent: s.urgent,
    illustration: ILLUSTRATION[s.key],
    action: s.done ? null : <StepAction step={s} onChanged={refresh} />,
  }));

  return (
    <>
      <Celebrate fire={celebrate} />
      <SetupGuide
        testId="customer-journey"
        eyebrow={journey.complete ? "All set" : "Get started"}
        title={journey.complete ? `You're all set${firstName ? `, ${firstName}` : ""}` : `Welcome to ONA${firstName ? `, ${firstName}` : ""}`}
        subtitle={
          journey.complete
            ? "You booked, paid and had your first session. Book again whenever you are ready."
            : "Your path from signing up to your first session. Each step ticks itself off as you go."
        }
        items={items}
        openKey={journey.next}
        onHide={() => void hide(true)}
        hideLabel="Hide the getting-started guide"
        done={
          journey.complete ? (
            <div className="flex flex-wrap items-center gap-4 px-3 py-4">
              <span aria-hidden="true" className="ona-pop grid size-12 place-items-center rounded-full bg-ok-bg text-ok">
                <PartyPopper className="size-6" />
              </span>
              <p className="flex-1 text-[15px] text-ink">Six for six. ONA keeps your receipts and bookings here.</p>
              <Button asChild className="h-11 font-bold">
                <Link href="/customer/book">Book your next session</Link>
              </Button>
            </div>
          ) : undefined
        }
      />
    </>
  );
}

function StepAction({ step: s, onChanged }: { step: JourneyStep; onChanged: () => void }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (s.action === "resend_verification") {
    return (
      <Button
        variant="outline"
        className="h-11 bg-surface md:h-9"
        disabled={busy || sent}
        onClick={async () => {
          setBusy(true);
          try {
            await resendVerification();
            setSent(true);
          } catch {
            toast.error("We could not send it just now. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <MailCheck aria-hidden="true" />
        {sent ? "Link sent — check your inbox" : busy ? "Sending…" : "Send the link again"}
      </Button>
    );
  }

  if (s.action === "phone") {
    return (
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const value = phone.trim();
          if (!/^\+?[\d\s()-]{9,16}$/.test(value)) {
            setError("Enter a Ghana number, e.g. 024 123 4567.");
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await savePhone(value);
            toast.success("Phone number saved.");
            onChanged();
          } catch (err) {
            setError(err instanceof ApiError ? (err.fieldErrors.phone?.[0] ?? err.formError) : "That did not save.");
            setBusy(false);
          }
        }}
      >
        <div className="grid min-w-0 flex-1 gap-1 sm:max-w-xs">
          <Label htmlFor="journey-phone" className="text-[13px]">Phone number</Label>
          <Input
            id="journey-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="024 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "journey-phone-error" : undefined}
            className="h-11 bg-surface md:h-9"
          />
        </div>
        <Button type="submit" className="h-11 font-bold md:h-9" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {error ? (
          <p id="journey-phone-error" className="basis-full text-[13px] text-err">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  if (s.href && s.cta) {
    return (
      <Button asChild className="h-11 font-bold md:h-9">
        <Link href={s.href}>
          {s.cta}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    );
  }
  return null;
}
