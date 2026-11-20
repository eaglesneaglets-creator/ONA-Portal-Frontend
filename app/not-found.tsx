import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 404.
 *
 * The musical metaphor is doing real work rather than decoration: "this track
 * isn't in the catalogue" says what happened in the platform's own language,
 * and the routes out are the ones someone actually wants — not a bare "go
 * home" that dumps them at the top of a funnel they had already left.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <ErrorMark />

      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
        Error 404
      </p>

      <h1 className="mb-4 max-w-[18ch] text-[clamp(28px,5vw,44px)] font-black leading-[1.08] tracking-tight text-ink">
        This track isn&rsquo;t in the catalogue
      </h1>

      <p className="mb-9 max-w-[46ch] text-[17px] leading-relaxed text-ink-dim">
        The page you were after has moved, or the link was wrong. Nothing has
        happened to your bookings or your money.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 px-6 font-bold">
          <Link href="/">Back to the homepage</Link>
        </Button>
        {/* There is no contact page; the questions page is the real next step. */}
        <Button asChild variant="outline" className="h-11 px-6 font-bold">
          <Link href="/faqs">Questions and answers</Link>
        </Button>
      </div>
    </main>
  );
}

/**
 * A level meter with one bar missing — the visual equivalent of a gap in a
 * track listing. Static, because this is not a loading state and motion here
 * would imply something is still happening.
 */
function ErrorMark() {
  // The middle bar is an empty slot, not a short bar. At the first attempt
  // it was a thin dashed outline and read as a rendering glitch rather than
  // a deliberate gap — so it is now full height, wider, and clearly hollow.
  const bars = [
    { h: "h-8", missing: false },
    { h: "h-14", missing: false },
    { h: "h-16", missing: true },
    { h: "h-12", missing: false },
    { h: "h-9", missing: false },
  ];

  return (
    <div aria-hidden="true" className="mb-8 flex items-end gap-2">
      {bars.map((bar, i) =>
        bar.missing ? (
          <span
            key={i}
            className={`${bar.h} w-3 rounded-pill border-2 border-dashed border-ink-mute/50`}
          />
        ) : (
          <span key={i} className={`${bar.h} w-3 rounded-pill bg-ona-red`} />
        ),
      )}
    </div>
  );
}
