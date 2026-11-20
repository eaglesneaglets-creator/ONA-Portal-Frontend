"use client";

import Link from "next/link";
import { useState } from "react";

import { Field, FormError, SubmitButton } from "@/components/auth/fields";
import { useAuthSubmit } from "@/components/auth/shared";
import { api } from "@/lib/api/client";

/**
 * /forgot-password — ask for a reset link.
 *
 * The API answers the same whether or not the address has an account, so
 * this page cannot be used to find out who is registered; the confirmation
 * says "if", for the same reason.
 */
export default function ForgotPasswordPage() {
  const { pending, formError, fieldErrors, submit } = useAuthSubmit();
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    void submit(async () => {
      await api.post("/auth/password-reset/", { email }, { retries: 0 });
      setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <div role="status">
        <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">Check your email</h1>
        <p className="mb-6 text-[14px] leading-relaxed text-ink-dim">
          If <b className="text-ink">{sentTo}</b> has an ONA account, a link to choose a new password is on
          its way. It works once and expires in a few days.
        </p>
        <Link href="/login" className="text-[13.5px] font-bold text-ona-red hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">Forgot your password?</h1>
      <p className="mb-6 text-[13.5px] text-ink-dim">
        Enter the email you use with ONA and we will send you a link to choose a new one.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          errors={fieldErrors.email}
        />
        <SubmitButton pending={pending}>Send the link</SubmitButton>
      </form>
      <p className="mt-6 text-center text-[13.5px] text-ink-dim">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-ona-red hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
