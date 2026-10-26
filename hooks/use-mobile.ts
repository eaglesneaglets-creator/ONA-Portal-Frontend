import { useSyncExternalStore } from "react";

/**
 * True below the md breakpoint. Used by the shadcn sidebar to switch to its
 * sheet (drawer) on phones.
 *
 * Rewritten from the generated version, which set state inside an effect
 * (flagged by the project's react-hooks rules, and a render-then-correct
 * flash). useSyncExternalStore is React's tool for subscribing to an external
 * source like a media query.
 */
const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // server render: assume desktop; corrected on hydration
  );
}
