import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

/**
 * Security headers on every response.
 *
 * Added after the 2026-10-13 review found none at all. With the refresh
 * token in localStorage (an interim decision until the domain cutover to an
 * httpOnly cookie), the browser-side defences matter more than usual.
 *
 * The Content-Security-Policy is NOT here: it carries a per-request script
 * nonce, so it is set by proxy.ts on every page response (Task 18).
 *
 * HSTS is set by the hosting edge in production; sending it from a local
 * http dev server would pin localhost to https, so it is production-only.
 * No `preload` yet, deliberately: the preload list takes only a registrable
 * domain you own (not *.up.railway.app), pins every subdomain to https in
 * browsers' built-in lists, and takes months to undo. Add it after the
 * production domain cutover, once every subdomain is on https.
 *
 * COOP, CORP and CSP reporting are set per page in proxy.ts.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

/**
 * Sentry (error reporting). Whether it reports at all is decided at runtime
 * by NEXT_PUBLIC_SENTRY_DSN (lib/monitoring/sentry.ts); this only shapes the
 * build.
 *
 *  - tunnelRoute: the browser posts events to /monitoring on this site, and
 *    app/sentry-tunnel/route.ts forwards them. Same-origin, so the CSP's
 *    connect-src 'self' covers it and ad-blockers do not eat crash reports.
 *    A fixed path, not `true` (random per build), so proxy.ts's matcher can
 *    skip it.
 *  - Source maps are uploaded only when SENTRY_AUTH_TOKEN is set (a Railway
 *    variable on production). Without it, CI, Playwright and local builds
 *    skip the upload and the extra memory it costs, and do not fail.
 *    After an upload the browser maps are deleted, so readable source is
 *    never served to visitors.
 *  - Tracing, replay and debug code are stripped from the bundle: errors
 *    only, about half the SDK's weight.
 *  - Release name: Railway's RAILWAY_GIT_COMMIT_SHA, read by the SDK.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  widenClientFileUpload: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
