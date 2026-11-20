"use client";

import { ArrowRight, IdCard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth/store";

/**
 * "Verify your identity to book" — shown only when the API says this
 * customer may not book until they send an identity check
 * (`must_verify_identity`, BOOKING_REQUIRES_IDENTITY_CHECK). The email
 * banner goes first: while the email is unconfirmed, that is the one thing
 * to do, so this one waits.
 */
export function VerifyIdentityBanner() {
  const user = useAuthStore((s) => s.user);
  if (!user?.must_verify_identity || user.must_verify_email) return null;

  return (
    <div
      role="status"
      data-testid="verify-identity-banner"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[14px] text-warn"
    >
      <IdCard aria-hidden="true" className="size-5 flex-none" />
      <p className="min-w-0 flex-1">
        <b>Verify your identity to book.</b> Send your Ghana Card or passport and a selfie — about three
        minutes. You can book as soon as it is sent.
      </p>
      <Button asChild variant="outline" size="sm" className="h-11 bg-surface md:h-8">
        <Link href="/customer/verify">
          Verify now <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
