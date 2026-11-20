/**
 * Server start-up hook (Next instrumentation). Loads Sentry for the Node
 * runtime and reports errors from server components, route handlers and
 * proxy.ts. No edge config: proxy.ts runs on Node in Next 16 and no route
 * opts into the edge runtime.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
