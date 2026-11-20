"use client";

import { ArrowRight, Rocket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { IllusDeposit, IllusEnvelope, IllusLaunch, IllusSession } from "@/components/journey/illustrations";
import { SetupGuide, type GuideItem } from "@/components/journey/setup-guide";
import { Button } from "@/components/ui/button";
import { adminApi, type Setup } from "@/lib/api/admin";

/**
 * "Launch ONA" — the staff side of the journey: everything that has to be
 * true before real bookings, as a setup guide grouped by area (backend:
 * StaffSetupView, ticked by manage.py launch_check itself). Items staff can
 * fix link straight to the screen; settings items say who changes them.
 *
 * Shown until nothing blocks launch; once ready it says so and can be hidden
 * for this browser.
 */
const PICTURE: Record<string, React.ReactNode> = {
  "Your studio": <IllusSession />,
  "Getting paid": <IllusDeposit />,
  "Invoices & receipts": <IllusLaunch />,
  "Talking to customers": <IllusEnvelope />,
  "Running day to day": <IllusLaunch />,
};
const HIDE_KEY = "ona.launch-guide-hidden";

export function LaunchGuide() {
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false; // storage off (or the server render): show it
    }
  });

  useEffect(() => {
    adminApi.setup().then(setSetup).catch(() => setSetup(null));
  }, []);

  if (!setup || (hidden && setup.ready)) return null;

  const items: GuideItem[] = setup.items.map((i) => ({
    key: i.key,
    group: i.group,
    title: i.title,
    done: i.done,
    urgent: i.level === "blocker",
    body: (
      <>
        {i.body}
        {!i.done && !i.href ? <span className="mt-1 block text-[13px] text-ink-mute">Changed in {i.where} — ask your developer.</span> : null}
      </>
    ),
    illustration: PICTURE[i.group],
    action:
      !i.done && i.href ? (
        <Button asChild className="h-11 font-bold md:h-9">
          <Link href={i.href}>
            Open {i.where}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      ) : null,
  }));

  return (
    <SetupGuide
      testId="launch-guide"
      eyebrow="Launch ONA"
      title={setup.ready ? "Ready to take real bookings" : `${setup.total - setup.done} things before ONA goes live`}
      subtitle={
        setup.ready
          ? "Nothing blocks launch. Anything left below is worth finishing, but it will not stop a customer booking."
          : setup.blockers
            ? `${setup.blockers} of them block launch. They are marked time-sensitive.`
            : "None of them block launch on their own — but customers will notice."
      }
      items={items}
      onHide={
        setup.ready
          ? () => {
              try {
                localStorage.setItem(HIDE_KEY, "1");
              } catch {
                /* fine */
              }
              setHidden(true);
            }
          : undefined
      }
      hideLabel="Hide — ONA is live"
      done={
        setup.ready && setup.done === setup.total ? (
          <div className="flex items-center gap-3 px-3 py-4 text-[15px] text-ink">
            <span aria-hidden="true" className="ona-pop grid size-11 place-items-center rounded-full bg-ok-bg text-ok">
              <Rocket className="size-5" />
            </span>
            Every check passes. ONA is ready.
          </div>
        ) : undefined
      }
    />
  );
}
