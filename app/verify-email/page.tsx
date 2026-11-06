"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore, type User } from "@/lib/auth/store";

/**
 * /verify-email?uid=&token= — the link from the "confirm your email" email
 * (Task 18). Public: it works signed in or out. Booking needs a confirmed
 * address, so once confirmed a signed-in customer's record is refreshed and
 * the booking page stops warning.
 */
function Verify() {
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"working" | "done" | "failed">(uid && token ? "working" : "failed");
  const [message, setMessage] = useState<string>(uid && token ? "" : "This link is incomplete.");
  const ran = useRef(false);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (ran.current || !uid || !token) return;
    ran.current = true;
    api
      .post("/auth/verify-email/", { uid, token }, { retries: 0, anonymous: true })
      .then(() => setState("done"))
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.formError : "Something went wrong. Please try again.");
        setState("failed");
      });
  }, [uid, token]);

  useEffect(() => {
    if (state === "done" && status === "authenticated") {
      api.get<User>("/auth/me/").then(setUser).catch(() => undefined);
    }
  }, [state, status, setUser]);

  return (
    <main className="bg-ona-wash flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-surface p-7 text-center shadow-card">
        <Image src="/ona-icon.png" alt="" width={48} height={48} className="mx-auto mb-5 rounded-pill" />
        {state === "working" ? (
          <p role="status" className="text-[15px] text-ink-dim">Confirming your email…</p>
        ) : state === "done" ? (
          <div role="status">
            <h1 className="mb-2 text-[24px] font-black tracking-tight text-ink">Email confirmed</h1>
            <p className="mb-6 text-[15px] text-ink-dim">Thank you. You can book studio time now.</p>
            <Button asChild className="h-11 px-6 font-bold">
              <Link href={status === "authenticated" ? "/customer/book" : "/login?next=%2Fcustomer%2Fbook"}>Book a session</Link>
            </Button>
          </div>
        ) : (
          <div role="alert">
            <h1 className="mb-2 text-[24px] font-black tracking-tight text-ink">That link did not work</h1>
            <p className="mb-6 text-[15px] text-ink-dim">
              {message} Sign in and ask for a new link from the booking page.
            </p>
            <Button asChild variant="outline" className="h-11 px-6 font-bold">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <Verify />
    </Suspense>
  );
}
