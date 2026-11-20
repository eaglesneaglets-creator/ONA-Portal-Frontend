/**
 * Browser error reporting (Sentry). Runs before React hydrates.
 *
 * Off unless NEXT_PUBLIC_SENTRY_DSN was set when this build ran. What is and
 * is not sent is decided in lib/monitoring/sentry.ts. Events go to
 * /monitoring on this site (next.config.ts tunnelRoute), so the CSP's
 * connect-src 'self' already covers them and nothing new is allowed.
 */
import * as Sentry from "@sentry/nextjs";

import { sharedOptions } from "@/lib/monitoring/sentry";

Sentry.init({
  ...sharedOptions,
  // Errors thrown by browser extensions are not ours, and can carry text
  // they scraped from the page.
  denyUrls: [/^(?:chrome|moz|safari(?:-web)?)-extension:\/\//i],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
