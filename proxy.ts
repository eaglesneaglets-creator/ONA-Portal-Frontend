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

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${API_ORIGIN}${dev ? " ws:" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(API_ORIGIN.startsWith("https:") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
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
