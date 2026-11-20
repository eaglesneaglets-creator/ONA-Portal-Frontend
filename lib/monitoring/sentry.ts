import type { Breadcrumb, BrowserOptions, ErrorEvent, EventHint, NodeOptions } from "@sentry/nextjs";

/**
 * What the website sends to Sentry, and what it never sends.
 *
 * Shared by instrumentation-client.ts (browser) and sentry.server.config.ts
 * (Node). Sentry is on only where NEXT_PUBLIC_SENTRY_DSN was set at build
 * time: production on Railway. Locally, in CI and in Playwright it is off.
 *
 * Privacy, because this site handles identity documents and payments:
 *  - @sentry/nextjs v11 has no `sendDefaultPii`. Left unset, its
 *    `dataCollection` collects IPs, cookies, headers, bodies and stack-frame
 *    variables, so every switch is set below.
 *  - Its URL filter only hides parameters NAMED like secrets: `uid` from an
 *    email link, `next` (which carries another page's query), a Paystack
 *    `reference` and the staff search `?q=<email>` would go out in clear. So
 *    every URL loses its query string and fragment, in events and
 *    breadcrumbs alike.
 *  - Click breadcrumbs quote aria-labels, and some name a person ("Account
 *    menu for Ama"): their values are blanked.
 *  - Console breadcrumbs are dropped; ApiError.detail (raw response
 *    bodies) is never attached because no extra-data integration is added.
 *  - No Session Replay: KYC and staff pages show ID numbers and photos.
 */

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

/** The same names as the backend's events: production, staging, local. */
export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?<!\d)(?:\+?233|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g;
const GHANA_CARD = /\bGHA-?\d{9}-?\d\b/gi;

/** Email addresses, Ghana phone numbers and Ghana Card numbers, masked. */
export function mask<T>(text: T): T {
  if (typeof text !== "string") return text;
  return text.replace(EMAIL, "[email]").replace(GHANA_CARD, "[id]").replace(PHONE, "[phone]") as T;
}

/** A URL without its query string or fragment. */
export function stripUrl<T>(url: T): T {
  if (typeof url !== "string") return url;
  return url.split(/[?#]/, 1)[0] as T;
}

/**
 * `button[aria-label="Account menu for Ama"]` -> `button[aria-label="…"]`
 *
 * The SDK writes `[attr="value"]` without escaping, so a value can itself
 * contain `"` (Ama "Kiki" Owusu). The value ends only where the next
 * attribute, the ` > ` separator or the end of the selector begins.
 */
function blankAttributes(selector: string): string {
  return selector.replace(/\[(aria-label|title|alt|name)=".*?"\](?=\[[a-z-]+="| > |$)/g, '[$1="…"]');
}

type WithFrames = { stacktrace?: { frames?: { filename?: string; abs_path?: string }[] } };

/**
 * Frames from inline scripts (React's streaming $RC/$RS, or the synthetic
 * frame for an error without a stack) are named after the page itself:
 * `app:///reset-password?uid=…&token=…`.
 */
function stripFrames(holder: WithFrames | undefined): void {
  for (const frame of holder?.stacktrace?.frames ?? []) {
    frame.filename = stripUrl(frame.filename);
    frame.abs_path = stripUrl(frame.abs_path);
  }
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === "console") return null;
  if (crumb.category?.startsWith("ui.") && typeof crumb.message === "string") {
    crumb.message = blankAttributes(crumb.message);
  }
  crumb.message = mask(crumb.message);
  if (crumb.data) {
    for (const key of ["url", "from", "to"]) {
      if (key in crumb.data) crumb.data[key] = stripUrl(crumb.data[key]);
    }
  }
  return crumb;
}

/**
 * Failures the app already handles and explains to the person: a signed-out
 * session, a dropped connection, a 4xx the form shows. Reporting them would
 * bury the errors that matter. Server errors (5xx) still report.
 */
export function isExpectedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; status?: unknown; code?: unknown };
  if (e.name !== "ApiError" || typeof e.status !== "number") return false;
  if (e.code === "network_error" || e.code === "session_expired" || e.code === "no_refresh_token") {
    return true;
  }
  return e.status > 0 && e.status < 500;
}

export function scrubEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  if (isExpectedError(hint?.originalException)) return null;

  delete event.user;
  if (event.request) {
    event.request.url = stripUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    const ua = event.request.headers?.["User-Agent"] ?? event.request.headers?.["user-agent"];
    event.request.headers = ua ? { "User-Agent": ua } : undefined;
  }
  if (typeof event.transaction === "string") event.transaction = stripUrl(event.transaction);
  event.message = mask(event.message);
  for (const ex of event.exception?.values ?? []) {
    ex.value = mask(ex.value);
    stripFrames(ex);
  }
  for (const thread of event.threads?.values ?? []) stripFrames(thread);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map((b) => scrubBreadcrumb(b))
      .filter((b): b is Breadcrumb => b !== null);
  }
  return event;
}

/**
 * Options both runtimes share. Errors only: no tracesSampleRate (even 0
 * switches tracing machinery on) and no replay.
 */
export const sharedOptions = {
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: SENTRY_ENVIRONMENT,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpBodies: [],
    urlQueryParams: false,
    httpHeaders: { request: { allow: ["user-agent"] }, response: false },
    stackFrameVariables: false,
    databaseQueryData: false,
  },
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
} satisfies BrowserOptions & NodeOptions;
