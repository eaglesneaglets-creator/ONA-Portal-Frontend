/**
 * Server error reporting (Sentry), for the Node runtime: server components,
 * route handlers and proxy.ts. Loaded by instrumentation.ts.
 *
 * Same DSN as the browser on purpose: the /monitoring tunnel
 * (app/sentry-tunnel/route.ts) only forwards envelopes for this DSN.
 */
import * as Sentry from "@sentry/nextjs";

import { sharedOptions } from "@/lib/monitoring/sentry";

Sentry.init({
  ...sharedOptions,
  // Server console output (CSP report samples, for one) is not for Sentry.
  integrations: (defaults) => defaults.filter((i) => i.name !== "Console"),
});
