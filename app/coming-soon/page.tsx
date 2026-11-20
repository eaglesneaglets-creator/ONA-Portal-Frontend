"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { useAuthStore } from "@/lib/auth/store";

/**
 * Holding page for roles whose portal is deferred.
 *
 * ADR-015 narrowed v0.1 to the customer and admin workflows. A professional
 * can still register — the backend accepts the role — but has nowhere to go:
 * lib/auth/roles.ts sends every deferred role here instead of into the
 * unbuilt /pro portal. This page is what they see.
 *
 * Deliberately a full-screen standalone like not-found.tsx, not a portal
 * shell: there is no sidebar of features to show them yet, and dressing the
 * page up as a dashboard would promise something that does not exist.
 *
 * Retire this page when DEFERRED_ROLES empties in v0.2.
 */
export default function ComingSoon() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <WaitingMark />

      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
        Professional accounts
      </p>

      <h1 className="mb-4 max-w-[18ch] text-[clamp(28px,5vw,44px)] font-black leading-[1.08] tracking-tight text-ink">
        Your account is ready. The marketplace isn&rsquo;t open yet.
      </h1>

      <p className="mb-9 max-w-[46ch] text-[17px] leading-relaxed text-ink-dim">
        ONA is launching studio bookings first and opening the professional
        marketplace in the next release. Nothing is lost: your sign-up is saved,
        no payment is involved, and you&rsquo;ll hear from ONA directly before
        profiles go live.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 px-6 font-bold">
          <Link href="/">Back to the homepage</Link>
        </Button>
        <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}

/**
 * A level meter with every bar at rest — nothing is playing yet. Static for
 * the same reason as the 404's mark: motion would imply something is loading,
 * and nothing is. Same five-bar silhouette as the 404 so the two pages read
 * as siblings, but no gap: nothing is missing here, it is just not started.
 */
function WaitingMark() {
  const heights = ["h-4", "h-4", "h-4", "h-4", "h-4"];
  return (
    <div aria-hidden="true" className="mb-8 flex items-end gap-2">
      {heights.map((h, i) => (
        <span key={i} className={`${h} w-3 rounded-pill bg-ink-mute/40`} />
      ))}
    </div>
  );
}
