/**
 * The split auth screen.
 *
 * Ports docs/design/pages/auth.html, which was reviewed and signed off.
 * The gradient panel carries the trust argument because that is the
 * objection at sign-up: this platform asks people to hand over money before
 * any work exists, so "your money is held, not handed over" belongs opposite
 * the form, not buried in a FAQ.
 *
 * The panel is hidden below 900px. On a phone it would push the form below
 * the fold, and someone who has opened a sign-in link wants the form.
 */

import Link from "next/link";
import Image from "next/image";

const TRUST_POINTS = [
  {
    icon: "shield",
    title: "Your money is held, not handed over",
    body: "ONA keeps payment until the work is done and you approve it.",
  },
  {
    icon: "lock",
    title: "Nobody gets your details",
    body: "Names and numbers stay private until a project is approved.",
  },
  {
    icon: "check",
    title: "Every professional is checked",
    body: "ONA reviews the work and the person before they appear.",
  },
] as const;

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* auth-panel is named so the browser holds it still across a
          /login <-> /register navigation; only the card slides. */}
      <aside className="auth-panel bg-ona-gradient hidden flex-col p-12 text-white lg:flex">
        <Link href="/" className="mb-auto flex items-center gap-3">
          <Image
            src="/ona-icon.png"
            alt=""
            width={40}
            height={40}
            className="rounded-pill bg-white p-1"
          />
          <span>
            <span className="block text-base font-black leading-none tracking-[0.02em]">
              ONA
            </span>
            <span className="mt-[3px] block text-[10.5px] tracking-[0.32em] opacity-80">
              RECORDS
            </span>
          </span>
        </Link>

        <h2 className="mb-7 max-w-[17ch] text-[clamp(24px,2.6vw,32px)] font-black leading-[1.15] tracking-tight">
          Book a studio. Hire a professional. Get paid safely.
        </h2>

        <ul className="mb-auto space-y-1">
          {TRUST_POINTS.map((point) => (
            <li key={point.title} className="flex gap-3 py-3">
              <TrustIcon name={point.icon} />
              <span>
                <b className="mb-0.5 block text-[13.5px] font-bold">{point.title}</b>
                <p className="text-[13.5px] leading-relaxed opacity-80">{point.body}</p>
              </span>
            </li>
          ))}
        </ul>

        <p className="pt-7 text-[10.5px] opacity-70">
          ONA Records Creative Services · Accra, Ghana
        </p>
      </aside>

      {/* Padding scales with the viewport instead of a fixed py-11.
          A laptop at 768px tall has no room to spare on the register form,
          and fixed padding is the difference between fitting and scrolling.

          overflow-y-auto is a safety net, not the plan: if a viewport is
          genuinely too short (a phone in landscape), the form scrolls
          rather than being clipped with its submit button unreachable. */}
      {/* relative + isolate so the gradient wash can sit behind the form
          without escaping this column on desktop. */}
      <main className="relative isolate flex items-center justify-center overflow-y-auto bg-surface px-5 py-4 sm:px-6 sm:py-8 lg:py-11">
        {/* Below lg the gradient panel is hidden, so the screen was plain
            white with no brand presence at all. This is a soft wash of the
            same gradient bleeding down from the top — enough to feel like
            ONA, faint enough that form labels keep their contrast.

            aria-hidden and pointer-events-none: decorative only, and it must
            never intercept a tap meant for the field beneath it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-[0.13] lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, var(--color-ona-blue) 0%, var(--color-ona-median) 45%, transparent 100%)",
          }}
        />

        <div className="auth-card w-full max-w-[392px]">
          {/* The logo lives in the gradient panel, which disappears below
              lg — taking the only brand mark with it. This is the compact
              stand-in for mobile and tablet. */}
          {/* Margin and mark size step up with available height. A 640px-tall
              phone has no room to spare on the register form, so the brand
              shrinks rather than pushing the submit button off screen —
              being visible at all is the point, not being large. */}
          {/* Sized by viewport HEIGHT, not width — this is a vertical-space
              problem, and a 360x900 phone has room where a 360x640 does not.
              The rules live in globals.css under `.auth-brand`, because
              Tailwind has no height-based variant: `min-h-[700px]:` is a
              MIN-HEIGHT utility, not a media query, and silently does
              nothing as a prefix. Verified: it left the logo at 28px on a
              900px-tall viewport. */}
          <Link
            href="/"
            className="auth-brand mb-4 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <Image
              src="/ona-icon.png"
              alt=""
              width={36}
              height={36}
              className="auth-brand-mark rounded-pill"
              priority
            />
            <span>
              <span className="auth-brand-name block font-black leading-none tracking-[0.02em] text-ink">
                ONA
              </span>
              <span className="auth-brand-arm mt-[3px] block tracking-[0.3em] text-ink-mute">
                RECORDS
              </span>
            </span>
            <span className="sr-only">ONA Records home</span>
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}

function TrustIcon({ name }: { name: "shield" | "lock" | "check" }) {
  const paths = {
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
    check: "M20 6 9 17l-5-5",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-5 w-5 flex-none opacity-90"
    >
      <path d={paths[name]} />
    </svg>
  );
}
