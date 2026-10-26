"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

/**
 * "Confirm your email to book" — shown only when the API says this customer
 * may not book yet (`must_verify_email`, Task 18). Offers a new link.
 */
export function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  if (!user?.must_verify_email) return null;

  async function resend() {
    setState("sending");
    try {
      await api.post("/auth/resend-verification/", {}, { retries: 0 });
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[14px] text-warn">
      <MailCheck aria-hidden="true" className="size-5 flex-none" />
      <p className="min-w-0 flex-1">
        <b>Confirm your email to book.</b> We sent a link to {user.email}.
        {state === "sent" ? " A new one is on its way." : state === "failed" ? " That did not send — try again shortly." : ""}
      </p>
      <Button variant="outline" size="sm" className="h-11 bg-surface md:h-8" disabled={state === "sending" || state === "sent"} onClick={() => void resend()}>
        {state === "sending" ? "Sending…" : state === "sent" ? "Sent" : "Send a new link"}
      </Button>
    </div>
  );
}
