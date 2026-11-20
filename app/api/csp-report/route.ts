/**
 * Where browsers send Content-Security-Policy violation reports (proxy.ts
 * names this URL in `report-uri` and in the `csp` Reporting-Endpoints entry).
 *
 * Two kinds arrive:
 *  - "enforce": something the live CSP blocked. Usually a browser extension;
 *    a burst from real pages after a deploy means the policy broke something.
 *  - "report": Trusted Types, which runs in report-only mode. These show
 *    which code writes HTML strings into the DOM; when they are understood
 *    (or there are none), Trusted Types can be enforced.
 *
 * They go to the server log (Railway), one line each, URLs without query
 * strings. Anyone can POST here, so the body is capped and logging is
 * rate-limited per instance: a flood costs a few lines, not the log.
 */

import { parseCspReports } from "@/lib/security/csp-report";

export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024;
const PER_MINUTE = 60;
let windowStart = 0;
let logged = 0;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!/application\/(csp-report|reports\+json|json)/.test(type)) return new Response(null, { status: 415 });

  const text = await request.text();
  if (text.length > MAX_BYTES) return new Response(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    logged = 0;
  }
  for (const v of parseCspReports(payload)) {
    if (logged >= PER_MINUTE) break;
    logged += 1;
    console.warn(
      `[csp] ${v.disposition} ${v.directive} blocked=${v.blocked || "-"} page=${v.page || "-"}` +
        (v.sample ? ` sample=${JSON.stringify(v.sample)}` : ""),
    );
  }
  return new Response(null, { status: 204 });
}
