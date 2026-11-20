/**
 * Content-Security-Policy violation reports, reduced to what is safe to log.
 *
 * Browsers send two shapes:
 *  - `application/csp-report` (the older report-uri): `{ "csp-report": {...} }`
 *    with kebab-case keys.
 *  - `application/reports+json` (Reporting API, report-to): an array of
 *    `{ type: "csp-violation", body: {...} }` with camelCase keys.
 *
 * URLs are cut to origin + path: query strings can carry tokens (a password
 * reset link, a Paystack reference), and reports must not leak them into logs
 * (Modern Web Guidance, security: "Data Hygiene for Reports").
 */

export type CspViolation = {
  directive: string;
  blocked: string;
  page: string;
  disposition: "enforce" | "report";
  sample: string;
};

const MAX_REPORTS = 20;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** "https://x.test/a/b?token=1#f" -> "https://x.test/a/b"; keywords ("inline", "eval", "trusted-types-sink") pass through. */
export function stripUrl(raw: string): string {
  if (!raw.includes(":") || !/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw.slice(0, 80);
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return `${u.origin}${u.pathname}`;
    return u.protocol.replace(/:$/, ""); // data:, blob:, chrome-extension: — the scheme says enough
  } catch {
    return "";
  }
}

function one(body: Record<string, unknown>, kebab: boolean): CspViolation | null {
  const get = (camel: string, k: string) => str(body[kebab ? k : camel]);
  const directive = get("effectiveDirective", "effective-directive") || get("violatedDirective", "violated-directive");
  if (!directive) return null;
  return {
    directive: directive.slice(0, 60),
    blocked: stripUrl(get("blockedURL", "blocked-uri")),
    page: stripUrl(get("documentURL", "document-uri")),
    disposition: get("disposition", "disposition") === "report" ? "report" : "enforce",
    // The first characters of the blocked code, from 'report-sample'. Enough
    // to recognise an inline script or a Trusted Types sink; capped short.
    sample: get("sample", "script-sample").slice(0, 40),
  };
}

export function parseCspReports(payload: unknown): CspViolation[] {
  if (Array.isArray(payload)) {
    return payload
      .slice(0, MAX_REPORTS)
      .filter((r) => r && typeof r === "object" && (r as { type?: unknown }).type === "csp-violation")
      .map((r) => (r as { body?: unknown }).body)
      .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
      .map((b) => one(b, false))
      .filter((v): v is CspViolation => v !== null);
  }
  if (payload && typeof payload === "object" && "csp-report" in payload) {
    const body = (payload as Record<string, unknown>)["csp-report"];
    if (body && typeof body === "object") {
      const v = one(body as Record<string, unknown>, true);
      return v ? [v] : [];
    }
  }
  return [];
}
