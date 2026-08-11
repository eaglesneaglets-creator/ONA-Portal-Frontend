"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field, FormError, PasswordField, SubmitButton } from "@/components/auth/fields";
import { LegalNote, ModeSwitch, useAuthSubmit } from "@/components/auth/shared";
import { homeFor } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Only two roles are offered. Admin accounts are created through the Django
 * admin, and the backend rejects `role: "admin"` here regardless — this is
 * the UI half of a rule enforced server-side.
 */
type SelfServiceRole = "customer" | "professional";

/**
 * Labels name the PERSON, not the transaction.
 *
 * "I need work done" and "I do the work" described the exchange, which is
 * both bland and slightly cold — someone booking a studio does not think of
 * themselves as a party to a transaction. "I'm hiring" and "I'm a creative"
 * are how these two actually describe themselves, and "creative" is already
 * the word the platform uses everywhere else (Creative #028).
 */
const ROLE_OPTIONS: Array<{ value: SelfServiceRole; title: string; body: string }> = [
  // Bodies are deliberately close in length. Uneven ones made one card wrap
  // to two lines while the other stayed on one, so the pair sat at different
  // heights and looked misaligned.
  { value: "customer", title: "I'm hiring", body: "Book a studio or a creative." },
  { value: "professional", title: "I'm a creative", body: "Offer your work to clients." },
];

function RegisterForm() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const { pending, formError, fieldErrors, submit } = useAuthSubmit();
  const [role, setRole] = useState<SelfServiceRole>("customer");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    void submit(async () => {
      const user = await register({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        password_confirm: String(data.get("password_confirm") ?? ""),
        first_name: String(data.get("first_name") ?? ""),
        last_name: String(data.get("last_name") ?? ""),
        role,
      });
      router.replace(homeFor(user.role));
    });
  }

  return (
    <>
      <ModeSwitch active="register" />

      {/* No visible heading or subtitle.
          The mode switch directly above already reads "Create account", so a
          26px "Create your account" underneath it said the same thing twice
          and cost ~50px — on the tallest form in the app, that was the
          difference between fitting and scrolling.

          The h1 stays in the accessibility tree: a page with no heading is
          hard to orient in with a screen reader, and this is the only place
          the page names itself. */}
      <h1 className="sr-only">Create your account</h1>

      <form onSubmit={onSubmit} noValidate>
        <FormError message={formError} />

        <fieldset className="mb-4">
          <legend className="mb-[7px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-mute">
            What brings you here?
          </legend>
          {/* items-stretch so both cards match height even if one wraps —
              matched copy alone would break the moment someone edits it. */}
          <div className="grid grid-cols-2 items-stretch gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                // aria-pressed rather than a hidden radio: this is a toggle
                // between two states, and a screen reader should hear which
                // one is active.
                aria-pressed={role === option.value}
                className={`rounded-md border bg-surface px-3 py-2.5 text-left transition-shadow ${
                  role === option.value
                    ? "border-ona-red shadow-[0_0_0_3px_rgba(201,0,7,0.1)]"
                    : "border-border-default hover:border-ink-mute"
                }`}
              >
                <b className="block text-[13px] text-ink">{option.title}</b>
                <p className="mt-0.5 text-[10.5px] leading-tight text-ink-mute">{option.body}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="First name"
            name="first_name"
            autoComplete="given-name"
            errors={fieldErrors.first_name}
            compact
          />
          <Field
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            errors={fieldErrors.last_name}
            compact
          />
        </div>

        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          errors={fieldErrors.email}
          compact
        />

        {/* The rule sits on the label row, not below the input. Underneath,
            it fell between the two password fields and read as a caption for
            "Confirm password" rather than a requirement for this one. */}
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          errors={fieldErrors.password}
          labelAction={
            <span className="text-[10.5px] text-ink-mute">10+ characters</span>
          }
          compact
        />

        <PasswordField
          label="Confirm password"
          name="password_confirm"
          autoComplete="new-password"
          required
          errors={fieldErrors.password_confirm}
          compact
        />

        <SubmitButton pending={pending}>Create account</SubmitButton>
        <LegalNote />
      </form>

      {/* No "Already have an account? Sign in" footer here. The mode switch
          at the top of the card already offers exactly that, and repeating
          it cost ~40px on the form most at risk of overflowing. Login keeps
          its footer, because login is short. */}
    </>
  );
}

export default function RegisterPage() {
  // RequireGuest and AuthShell live in app/(auth)/layout.tsx — see the note
  // in login/page.tsx.
  return <RegisterForm />;
}
