"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { FormError, PasswordField, SubmitButton } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { useAuthSubmit } from "@/components/auth/shared";
import { api } from "@/lib/api/client";

/**
 * /reset-password?uid=&token=[&welcome=1] — choose a password from an
 * emailed link.
 *
 * Two doors lead here: "Forgot password?", and the welcome email a customer
 * gets when ONA staff book for them and create their account (Task 15,
 * `welcome=1`). Same single-use token either way; only the words differ.
 * Using the link also confirms the email address.
 */
function ResetForm() {
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const welcome = params.get("welcome") === "1";
  const { pending, formError, fieldErrors, submit } = useAuthSubmit();
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    return (
      <>
        <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">This link is incomplete</h1>
        <p className="mb-6 text-[14px] leading-relaxed text-ink-dim">
          Open the link from your email again, or ask for a new one.
        </p>
        <Link href="/forgot-password" className="text-[13.5px] font-bold text-ona-red hover:underline">
          Send me a new link
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <div role="status">
        <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">
          {welcome ? "You're all set" : "Password updated"}
        </h1>
        <p className="mb-6 text-[14px] leading-relaxed text-ink-dim">
          Sign in with your email and the password you just chose
          {welcome ? " to see the session ONA booked with you." : "."}
        </p>
        <Button asChild className="h-11 px-6 font-bold">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit(async () => {
      await api.post(
        "/auth/password-reset/confirm/",
        { uid, token, password: data.get("password"), password_confirm: data.get("password_confirm") },
        { retries: 0 },
      );
      setDone(true);
    });
  }

  // A bad or used token is reported against `token`, which has no input.
  const tokenError = fieldErrors.token?.[0] ?? null;

  return (
    <>
      <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">
        {welcome ? "Welcome to ONA Records" : "Choose a new password"}
      </h1>
      <p className="mb-6 text-[13.5px] text-ink-dim">
        {welcome
          ? "ONA has set up your account. Choose a password to see and manage your bookings."
          : "Pick something you have not used here before."}
      </p>
      <form onSubmit={onSubmit} noValidate>
        <FormError message={tokenError ?? formError} />
        {tokenError ? (
          <p className="-mt-2 mb-4 text-[13px]">
            <Link href="/forgot-password" className="font-bold text-ona-red hover:underline">
              Send me a new link
            </Link>
          </p>
        ) : null}
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 10 characters"
          required
          errors={fieldErrors.password}
        />
        <PasswordField
          label="Confirm password"
          name="password_confirm"
          autoComplete="new-password"
          placeholder="The same again"
          required
          errors={fieldErrors.password_confirm}
        />
        <SubmitButton pending={pending}>{welcome ? "Set password" : "Update password"}</SubmitButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
