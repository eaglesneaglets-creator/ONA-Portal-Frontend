import { POST as forward } from "@sentry/nextjs/tunnel";

/**
 * The Sentry tunnel. next.config.ts rewrites /monitoring here; the browser
 * SDK posts its error envelopes to that same-origin path and this forwards
 * them to Sentry.
 *
 * Sentry's handler only forwards envelopes addressed to this site's own DSN
 * (anything else is a 403), and never forwards cookies or Authorization.
 * Two things are added around it, because this is a public endpoint:
 *  - a size cap, so it cannot be used to make the server buffer and relay
 *    large bodies. An errors-only envelope is a few KB.
 *  - the visitor's IP is not passed on. Sentry's handler would send it as
 *    X-Sentry-Forwarded-For, built from these headers.
 */
const MAX_BYTES = 256 * 1024;
const IP_HEADERS = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "x-vercel-forwarded-for", "forwarded"];

export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return new Response(null, { status: 413 });

  const headers = new Headers(request.headers);
  for (const name of IP_HEADERS) headers.delete(name);
  headers.set("content-length", String(body.byteLength));
  return forward(new Request(request.url, { method: "POST", headers, body }));
}
