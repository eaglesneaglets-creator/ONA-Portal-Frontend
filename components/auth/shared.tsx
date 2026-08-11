/**
 * Pieces both auth pages use.
 *
 * Extracted because login and register had the same mode switch, the same
 * error-handling boilerplate, and the same legal note. Three copies of a
 * rule is how one of them ends up subtly different.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, type FieldErrors } from "@/lib/api/errors";
import { navigateWithTransition } from "@/lib/ui/view-transition";

/**
 * The Sign in / Create account toggle.
 *
 * Navigation goes through startViewTransition so the form card slides while
 * the gradient panel holds still. Direction follows the tab order — moving
 * to register slides forward, back to login slides back — so the movement
 * corresponds to what was clicked rather than always going one way.
 *
 * Still real <Link>s underneath: middle-click, ctrl-click and "open in new
 * tab" all keep working, and the transition is a progressive enhancement on
 * top. Replacing them with buttons would have broken all three.
 */
export function ModeSwitch({ active }: { active: "login" | "register" }) {
  const router = useRouter();

  const tabs = [
    { key: "login" as const, href: "/login", label: "Sign in" },
    { key: "register" as const, href: "/register", label: "Create account" },
  ];

  return (
    <div className="mb-6 flex gap-[3px] rounded-md border border-border-default bg-surface-sunk p-1">
      {tabs.map((tab) =>
        tab.key === active ? (
          <span
            key={tab.key}
            aria-current="page"
            className="flex-1 rounded-sm bg-surface py-2.5 text-center text-[13.5px] font-bold text-ink shadow-card"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={tab.href}
            onClick={(event) => {
              // Let the browser handle modified clicks — those mean "open
              // elsewhere", not "transition this page".
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              navigateWithTransition(
                tab.key === "register" ? "forward" : "back",
                () => router.push(tab.href),
              );
            }}
            className="flex min-h-[var(--tap-min)] flex-1 items-center justify-center rounded-sm text-center text-[13.5px] font-bold text-ink-mute hover:text-ink"
          >
            {tab.label}
          </Link>
        ),
      )}
    </div>
  );
}

export function LegalNote() {
  return (
    <p className="mt-3 text-[10.5px] leading-snug text-ink-mute">
      By continuing you agree to our{" "}
      <Link href="/legal/terms" className="text-ink-dim underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/legal/privacy" className="text-ink-dim underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/**
 * Submit state plus the field/form error split.
 *
 * The split is the point. Task 12 found that `non_field_errors` was being
 * treated as a field name, so a wrong password rendered against an input
 * that does not exist and the user saw nothing. Routing every failure
 * through here means both pages handle it the same way.
 */
export function useAuthSubmit() {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(action: () => Promise<void>) {
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await action();
      // Deliberately leaves `pending` true on success: the page is
      // navigating away, and re-enabling the button first lets someone
      // double-submit a registration.
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.formError);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setPending(false);
    }
  }

  return { pending, formError, fieldErrors, submit };
}
