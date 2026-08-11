/**
 * Loading indicators.
 *
 * Five bars bouncing like a level meter. Musical without being literal, and
 * it reads as "working" rather than "waiting" — a spinning record implies a
 * delay even when there isn't one.
 *
 * No JavaScript, no images: pure CSS keyframes, so it renders instantly and
 * costs nothing on a 200ms load. Respects prefers-reduced-motion, because a
 * bouncing animation is exactly the kind of thing that triggers vestibular
 * discomfort, and someone who has asked the OS for less motion should get it.
 */

const BAR_COUNT = 5;

/**
 * Staggered delays and differing durations, so the bars do not move as one
 * block. A synchronised set reads as a progress bar; an offset set reads as
 * audio.
 */
/**
 * Staggered delays and differing durations, so the bars do not move as one
 * block. A synchronised set reads as a progress bar; an offset set reads as
 * audio. Heights live in SIZES.
 */
const BARS = [
  { delay: "0ms", duration: "620ms" },
  { delay: "120ms", duration: "540ms" },
  { delay: "60ms", duration: "700ms" },
  { delay: "180ms", duration: "580ms" },
  { delay: "40ms", duration: "660ms" },
];

interface EqualiserProps {
  /** Announced to screen readers. Say what is loading, not "loading". */
  label?: string;
  size?: "sm" | "md" | "lg";
  /** On the brand gradient, where the bars need to be white. */
  onDark?: boolean;
}

/**
 * Sizes as LITERAL Tailwind classes, one complete string per bar.
 *
 * Written out in full on purpose. Tailwind 4 scans source files for whole
 * class names, so a class assembled at runtime — `h-${size}` or a lookup
 * that yields only the fragment — is never generated. That is what went
 * wrong earlier: `h-16` was absent from the compiled CSS and the bars fell
 * back to their content height, which is why they looked like squat dashes.
 *
 * Spelling each variant out keeps the tokens and stays scannable. The one
 * rule is that these strings must never be built by concatenation.
 *
 * Heights vary per bar because a real level meter is not uniform — the mids
 * carry more energy than the edges. Ratios matter too: the animation scales
 * to 0.28, so even the shortest state stays taller than it is wide.
 */
const SIZES = {
  sm: {
    gap: "gap-1",
    bars: ["h-4 w-[3px]", "h-6 w-[3px]", "h-5 w-[3px]", "h-6 w-[3px]", "h-4 w-[3px]"],
  },
  md: {
    gap: "gap-[5px]",
    bars: ["h-7 w-1", "h-10 w-1", "h-8 w-1", "h-10 w-1", "h-6 w-1"],
  },
  lg: {
    gap: "gap-[7px]",
    bars: [
      "h-11 w-[5px]",
      "h-16 w-[5px]",
      "h-14 w-[5px]",
      "h-16 w-[5px]",
      "h-10 w-[5px]",
    ],
  },
} as const;

export function Equaliser({ label = "Loading", size = "md", onDark }: EqualiserProps) {
  const s = SIZES[size];

  return (
    <div
      role="status"
      aria-live="polite"
      // items-center, not items-end: the bars scale from their own centre,
      // so pinning them to a baseline would fight the transform and push
      // the group low in its box.
      className={`flex items-center ${s.gap}`}
    >
      {/* The only thing a screen reader gets. The bars themselves are
          decorative and would otherwise be announced as nothing at all. */}
      <span className="sr-only">{label}</span>

      {BARS.slice(0, BAR_COUNT).map((bar, i) => (
        <span
          key={i}
          aria-hidden="true"
          // `block` is load-bearing: a <span> is inline by default, and
          // inline elements ignore height entirely.
          className={`ona-eq-bar block rounded-pill ${s.bars[i]} ${
            onDark ? "bg-white/80" : "bg-ona-red"
          }`}
          // Only the timing stays inline — there is no Tailwind utility for
          // a per-element animation delay, and generating five of each would
          // be worse than two declarations.
          style={{
            animationDelay: bar.delay,
            animationDuration: bar.duration,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen loading state, for a route that is still resolving.
 *
 * Centred with generous space rather than pinned to the top: this is the
 * whole page, and a small indicator floating at the top edge reads as a
 * broken layout.
 */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    // flex-1 with a min-height, NOT min-h-[60vh].
    //
    // 60vh was wrong: a box 60% of the viewport tall, starting near the top,
    // centres its contents about a third of the way down the page — which
    // reads as "stuck near the top", not centred.
    //
    // flex-1 makes this fill whatever space the parent actually has (the
    // portal's <main> is already a flex column), so centring inside it lands
    // in the true middle of the content area. The min-height is a floor for
    // the case where the parent is not a flex container.
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-5">
      <Equaliser label={label} size="lg" />
      <p className="text-[13.5px] text-ink-mute" aria-hidden="true">
        {label}…
      </p>
    </div>
  );
}

/**
 * The splash shown while the session is being restored on first paint.
 *
 * Uses the brand gradient because at this moment we do not yet know who the
 * user is, so there is no portal chrome to show — a full-bleed brand surface
 * is more honest than a half-rendered shell.
 */
export function SessionSplash() {
  return (
    <div className="bg-ona-gradient flex min-h-screen flex-col items-center justify-center gap-6">
      <Equaliser label="Checking your session" size="lg" onDark />
      <p className="text-[13.5px] text-white/75" aria-hidden="true">
        One moment…
      </p>
    </div>
  );
}
