import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy with a per-request script nonce (Task 18; launch
 * blocker from the 2026-10-13 review).
 *
 * script-src allows only scripts carrying this request's nonce, plus what
 * they load ('strict-dynamic'). An injected <script> — or an inline event
 * handler from a stored-XSS string — does not run. That matters more than
 * usual here: the refresh token lives in localStorage until the httpOnly
 * cookie cutover.
 *
 * Next applies the nonce to its own bootstrap scripts during server render,
 * which is why the root layout opts every page into dynamic rendering
 * (app/layout.tsx). See node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md.
 *
 * Deliberate choices:
 *  - style-src keeps 'unsafe-inline': Radix popovers, toasts and next/image
 *    set inline style ATTRIBUTES, which a nonce cannot cover. Injected CSS is
 *    a far smaller risk than injected script.
 *  - connect-src names the API's origin, which is not this one.
 *  - upgrade-insecure-requests only when the API is on https, so an http
 *    local preview is not upgraded into a broken connection.
 *
 * Reporting (2026-11-20, Modern Web Guidance security review):
 *  - Violations go to /api/csp-report: `report-to csp` for browsers with the
 *    Reporting API, `report-uri` for the rest. 'report-sample' adds the first
 *    40 characters of what was blocked, so a report can be recognised.
 *  - Trusted Types runs REPORT-ONLY. Enforcing it blocks every HTML string
 *    written into the DOM unless it passes a named policy; React and Next
 *    must be confirmed clean first. Watch the "[csp] report
 *    require-trusted-types-for" log lines; when there are none from real
 *    pages, move the directive into the enforced policy.
 *  - Cross-Origin-Opener-Policy: same-origin-allow-popups cuts the link to a
 *    cross-site window that opened this page (no tab-nabbing, no XS-leaks
 *    through window references). Paystack checkout is a full navigation, not
 *    a popup, so it is unaffected; "allow-popups" keeps any future popup
 *    flow working.
 *  - Cross-Origin-Resource-Policy: same-origin, on pages only: another site
 *    cannot load ONA's HTML as a subresource. Images and scripts are not
 *    matched here, so an email client showing the logo still works.
 */

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").origin;
  } catch {
    return "";
  }
})();

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";

  const report = ["report-uri /api/csp-report", "report-to csp"];
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'report-sample'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${API_ORIGIN}${dev ? " ws:" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(API_ORIGIN.startsWith("https:") ? ["upgrade-insecure-requests"] : []),
    ...report,
  ].join("; ");
  const reportOnly = ["require-trusted-types-for 'script'", ...report].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Content-Security-Policy-Report-Only", reportOnly);
  response.headers.set("Reporting-Endpoints", 'csp="/api/csp-report"');
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
