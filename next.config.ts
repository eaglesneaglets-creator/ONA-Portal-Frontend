import type { NextConfig } from "next";

/**
 * Security headers on every response.
 *
 * Added after the 2026-10-13 review found none at all. With the refresh
 * token in localStorage (an interim decision until the domain cutover to an
 * httpOnly cookie), the browser-side defences matter more than usual.
 *
 * The CSP here is deliberately the part that cannot break the app:
 * frame-ancestors (clickjacking on the login form), object-src, base-uri and
 * form-action. A full script-src policy needs per-request nonces wired into
 * Next's inline bootstrap scripts — that is Phase 4 (Task 18), not a header
 * one can add blind without breaking hydration.
 *
 * HSTS is set by the hosting edge in production; sending it from a local
 * http dev server would pin localhost to https, so it is production-only.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
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

export default nextConfig;
