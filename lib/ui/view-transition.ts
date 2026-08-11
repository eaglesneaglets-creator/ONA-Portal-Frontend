/**
 * Directional route transitions, using the browser's View Transitions API.
 *
 * WHY NOT React's <ViewTransition>
 * Next 16's guide documents it, but React 19.2.4 does not export it — it
 * needs a canary build. Upgrading React for an animation is not a trade
 * worth making, and the native API produces the same result with no
 * dependency at all.
 *
 * WHAT THIS DOES
 * startViewTransition snapshots the page, runs a DOM update, then
 * cross-fades between the two snapshots. Naming elements with
 * `view-transition-name` lets the browser match them across the change, so
 * the gradient panel holds still while the form card slides.
 *
 * PROGRESSIVE ENHANCEMENT
 * Unsupported browsers (Firefox at time of writing) fall through to a plain
 * navigation. Nothing breaks; the slide is simply absent.
 */

"use client";

type Direction = "forward" | "back";

/** Feature detection, guarded for server rendering. */
function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as Document & { startViewTransition?: unknown })
      .startViewTransition === "function"
  );
}

/**
 * Run a navigation inside a view transition.
 *
 * `direction` is written to the root element so CSS can pick which way the
 * card slides — going to register moves forward (in from the right), going
 * back to login moves back (in from the left). Without it both directions
 * animate identically and the movement stops meaning anything.
 */
export function navigateWithTransition(direction: Direction, navigate: () => void): void {
  if (!supportsViewTransitions()) {
    navigate();
    return;
  }

  const root = document.documentElement;
  root.dataset.transitionDirection = direction;

  const doc = document as Document & {
    startViewTransition: (cb: () => void | Promise<void>) => { finished: Promise<void> };
  };

  const transition = doc.startViewTransition(() => {
    navigate();
  });

  // Clear the flag once the animation has settled, so a later navigation
  // that does not set a direction does not inherit this one.
  transition.finished.finally(() => {
    delete root.dataset.transitionDirection;
  });
}
