"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Client-side crash boundary.
 *
 * Next renders this when a component throws during render. The `reset`
 * callback retries the segment, which genuinely fixes transient failures —
 * a request that timed out, a race on first paint — so it is offered first.
 *
 * The copy avoids implying the user broke something, and explicitly says
 * their money is untouched. On a platform holding funds in escrow, an
 * unexplained error screen invites exactly that worry.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry is wired on the backend but not here yet. Until it is, the
    // console is the only record — better than swallowing it silently.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <ErrorMark />

      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
        Something broke
      </p>

      <h1 className="mb-4 max-w-[20ch] text-[clamp(28px,5vw,44px)] font-black leading-[1.08] tracking-tight text-ink">
        We dropped a beat
      </h1>

      <p className="mb-9 max-w-[48ch] text-[17px] leading-relaxed text-ink-dim">
        Something went wrong at our end, not yours. Your bookings, projects and
        any money ONA is holding are all untouched.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[var(--tap-min)] items-center rounded-md bg-ona-red px-6 font-bold text-white transition-colors hover:bg-ona-tertiary"
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex min-h-[var(--tap-min)] items-center rounded-md border border-border-default px-6 font-bold text-ink transition-colors hover:border-ink-mute"
        >
          Back to the homepage
        </Link>
      </div>

      {/* The digest is what support needs to find this exact failure in the
          logs. Shown quietly rather than hidden: asking someone to open
          devtools is not a reasonable ask. */}
      {error.digest && (
        <p className="mt-9 font-mono text-[10.5px] text-ink-mute">
          Reference: {error.digest}
        </p>
      )}
    </main>
  );
}

/** A level meter with a broken bar — the visual of a signal cutting out. */
function ErrorMark() {
  return (
    <div aria-hidden="true" className="mb-8 flex items-end gap-2">
      {["h-10", "h-14", "h-3", "h-3", "h-12"].map((h, i) => (
        <span
          key={i}
          className={`w-3 rounded-pill ${h} ${
            // Two bars flatlined — the signal cutting out.
            i === 2 || i === 3 ? "bg-ink-mute/40" : "bg-ona-red"
          }`}
        />
      ))}
    </div>
  );
}
