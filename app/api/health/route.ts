/**
 * Liveness probe for Railway.
 *
 * Railway needs a URL that proves the server is up. Without one it probes
 * `/`, which on this app renders the marketing page — so a broken component
 * or a slow render reads as a failed deploy, and a healthy server that
 * happens to 500 on its homepage gets restarted in a loop.
 *
 * This deliberately does NOT check the backend API. A liveness probe answers
 * "is this process serving traffic", and nothing else. If it went to Django
 * and Django were down, Railway would restart a perfectly healthy frontend —
 * repeatedly, and to no effect, since restarting Next cannot fix Postgres.
 * Backend health is the backend's own /api/v1/health/ endpoint.
 */

import { NextResponse } from "next/server";

// Without this Next prerenders the route at build time and serves a static
// response with a build-time timestamp, so the probe would keep passing
// after the server had stopped being able to serve anything.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      // Which environment answered. The frontend has no database and no
      // migrations, so unlike the backend there is nothing else meaningful
      // to report — but confirming WHICH deploy responded is worth having
      // when staging and production are one DNS record apart.
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? "unknown",
    },
    {
      // A cached health check is a lie: a CDN or proxy would keep returning
      // 200 from a server that had since died.
      headers: { "Cache-Control": "no-store" },
    },
  );
}
