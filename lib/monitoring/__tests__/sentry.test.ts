import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { isExpectedError, mask, scrubBreadcrumb, scrubEvent, sharedOptions, stripUrl } from "../sentry";

const SECRETS = [
  "uid=MQ", "token=abc", "reference=PSK", "trxref", "next=", "q=ama", "ama@example.com",
  "024 123 4567", "GHA-123456789-0", "Account menu for Ama", "#frag", "hunter2", "sessionid",
];

function event(): ErrorEvent {
  return {
    type: undefined,
    message: "Failed for ama@example.com",
    user: { id: "1", email: "ama@example.com", ip_address: "{{auto}}" },
    transaction: "/verify-email?uid=MQ&token=abc",
    request: {
      url: "https://www.onaplay.com/verify-email?uid=MQ&token=abc#frag",
      query_string: "uid=MQ&token=abc",
      cookies: { sessionid: "x" },
      data: { password: "hunter2" },
      headers: {
        "User-Agent": "UA",
        Referer: "https://www.onaplay.com/login?next=%2Fcustomer%2Fpayments%2Freturn%3Freference%3DPSK",
      },
    },
    exception: { values: [{ type: "Error", value: "card GHA-123456789-0, MoMo 024 123 4567" }] },
    breadcrumbs: [
      { category: "navigation", data: { from: "/login?next=%2Fx%3Freference%3DPSK", to: "/admin/bookings?q=ama@example.com" } },
      { category: "fetch", data: { url: "https://api.onaplay.com/api/v1/admin/customers/?search=ama@example.com", status_code: 200 } },
      { category: "ui.click", message: 'body > header > button[aria-label="Account menu for Ama"]' },
      { category: "console", message: "hunter2" },
      { category: "navigation", data: { from: "/customer/payments/return?reference=PSK&trxref=PSK", to: "/customer" } },
    ],
  } as ErrorEvent;
}

describe("Sentry scrubbing", () => {
  it("sends no query string, fragment, person or secret", () => {
    const out = scrubEvent(event(), {});
    const flat = JSON.stringify(out);
    for (const s of SECRETS) expect(flat, s).not.toContain(s);
    expect(out?.user).toBeUndefined();
    expect(out?.request?.url).toBe("https://www.onaplay.com/verify-email");
    expect(out?.request?.headers).toEqual({ "User-Agent": "UA" });
    expect(out?.transaction).toBe("/verify-email");
  });

  it("keeps what makes an error useful", () => {
    const out = scrubEvent(event(), {})!;
    expect(out.breadcrumbs?.map((b) => b.category)).toEqual(["navigation", "fetch", "ui.click", "navigation"]);
    expect(out.breadcrumbs?.[1].data).toEqual({ url: "https://api.onaplay.com/api/v1/admin/customers/", status_code: 200 });
    expect(out.breadcrumbs?.[2].message).toBe('body > header > button[aria-label="…"]');
    expect(out.exception?.values?.[0].value).toBe("card [id], MoMo [phone]");
  });

  it("strips the page query from stack frame file names", () => {
    const e = event();
    e.exception!.values![0].stacktrace = {
      frames: [
        { filename: "app:///reset-password?uid=MQ&token=abc", abs_path: "https://www.onaplay.com/admin/customers?q=ama@example.com" },
        { filename: "app:///_next/static/chunks/a.js" },
      ],
    };
    const frames = scrubEvent(e, {})!.exception!.values![0].stacktrace!.frames!;
    expect(frames[0]).toEqual({ filename: "app:///reset-password", abs_path: "https://www.onaplay.com/admin/customers" });
    expect(frames[1].filename).toBe("app:///_next/static/chunks/a.js");
  });

  it("blanks names in click breadcrumbs even when they contain quotes", () => {
    const crumb = (message: string) => scrubBreadcrumb({ category: "ui.click", message })!.message;
    expect(crumb('div > a.btn[aria-label="Call Ama "Kiki" Owusu"]')).toBe('div > a.btn[aria-label="…"]');
    expect(crumb('button.x[aria-label="Actions for Jo "J" Doe"][type="button"] > svg')).toBe(
      'button.x[aria-label="…"][type="button"] > svg',
    );
    expect(crumb('button[title="Kofi"][type="submit"]')).toBe('button[title="…"][type="submit"]');
  });

  it("drops console breadcrumbs as they happen", () => {
    expect(scrubBreadcrumb({ category: "console", message: "x" })).toBeNull();
  });

  it("masks emails, Ghana phones and Ghana Card numbers but not amounts or times", () => {
    expect(mask("ama@example.com, +233 24 123 4567, 0241234567, GHA-123456789-0")).toBe(
      "[email], [phone], [phone], [id]",
    );
    expect(mask("GHS 20000 at 10:00, ref ONA-7K2Q9")).toBe("GHS 20000 at 10:00, ref ONA-7K2Q9");
  });

  it("strips query and fragment, and leaves non-strings alone", () => {
    expect(stripUrl("/a?b=c#d")).toBe("/a");
    expect(stripUrl("/a#d")).toBe("/a");
    expect(stripUrl(undefined)).toBeUndefined();
  });
});

describe("expected API failures are not reported", () => {
  it.each([
    [new ApiError("x", 400, "validation_error"), true],
    [new ApiError("x", 401, "session_expired"), true],
    [new ApiError("x", 404, "not_found"), true],
    [new ApiError("x", 0, "network_error"), true],
    [new ApiError("x", 500, "error"), false],
    [new ApiError("x", 503, "kyc_unavailable"), false],
    [new Error("render crash"), false],
    [null, false],
  ])("%o -> %s", (error, expected) => {
    expect(isExpectedError(error)).toBe(expected);
  });

  it("drops the whole event for an expected one", () => {
    expect(scrubEvent(event(), { originalException: new ApiError("x", 400, "validation_error") })).toBeNull();
  });
});

describe("Sentry options", () => {
  it("collects no personal data and is off without a DSN", () => {
    expect(sharedOptions.dataCollection).toMatchObject({
      userInfo: false, cookies: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false,
    });
    // Tests, CI and local builds have no NEXT_PUBLIC_SENTRY_DSN.
    expect(sharedOptions.enabled).toBe(false);
    expect("tracesSampleRate" in sharedOptions).toBe(false);
  });
});
