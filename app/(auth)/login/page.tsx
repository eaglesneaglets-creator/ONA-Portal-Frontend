"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Field, FormError, PasswordField, SubmitButton } from "@/components/auth/fields";
import { LegalNote, ModeSwitch, useAuthSubmit } from "@/components/auth/shared";
import { safeNext } from "@/lib/auth/redirect";
import { homeFor } from "@/lib/auth/roles";
import { useAuthStore } from "@/lib/auth/store";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const { pending, formError, fieldErrors, submit } = useAuthSubmit();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    void submit(async () => {
      const user = await login(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      router.replace(safeNext(params.get("next")) ?? homeFor(user.role));
    });
  }

  return (
    <>
      <ModeSwitch active="login" />

      <h1 className="mb-[5px] text-[26px] font-black tracking-tight text-ink">Welcome back</h1>
      <p className="mb-6 text-[13.5px] text-ink-dim">
        Sign in to your bookings, projects and messages.
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

        {/* The link sits on the label's baseline, not absolutely over it —
            absolute positioning put it on top of the label text. */}
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          errors={fieldErrors.password}
          labelAction={
            <Link
              href="/reset-password"
              className="text-[10.5px] font-bold text-ona-red hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <SubmitButton pending={pending}>Sign in</SubmitButton>
        <LegalNote />
      </form>

      <p className="mt-6 text-center text-[13.5px] text-ink-dim">
        New to ONA?{" "}
        <Link href="/register" className="font-bold text-ona-red hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  // RequireGuest and AuthShell live in app/(auth)/layout.tsx. Keeping the
  // shell out of the page is what lets the gradient panel stay mounted
  // across a /login <-> /register navigation, so only the card slides.
  return (
    // useSearchParams needs a Suspense boundary, or the whole route opts
    // out of static rendering.
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
