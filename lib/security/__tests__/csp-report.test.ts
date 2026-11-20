import { describe, expect, it } from "vitest";

import { parseCspReports, stripUrl } from "@/lib/security/csp-report";

describe("stripUrl", () => {
  it("drops query strings and fragments, which can carry tokens", () => {
    expect(stripUrl("https://ona.test/reset-password?uid=1&token=secret#x")).toBe("https://ona.test/reset-password");
  });
  it("keeps keywords and reduces other schemes to the scheme", () => {
    expect(stripUrl("inline")).toBe("inline");
    expect(stripUrl("trusted-types-sink")).toBe("trusted-types-sink");
    expect(stripUrl("data:text/html;base64,AAAA")).toBe("data");
    expect(stripUrl("chrome-extension://abc/x.js")).toBe("chrome-extension");
  });
});

describe("parseCspReports", () => {
  it("reads the Reporting API shape (report-to)", () => {
    const out = parseCspReports([
      {
        type: "csp-violation",
        body: {
          effectiveDirective: "require-trusted-types-for",
          blockedURL: "trusted-types-sink",
          documentURL: "https://ona.test/customer/book?step=2",
          disposition: "report",
          sample: "Element innerHTML|<b>hello</b>",
        },
      },
      { type: "deprecation", body: { id: "x" } },
    ]);
    expect(out).toEqual([
      {
        directive: "require-trusted-types-for",
        blocked: "trusted-types-sink",
        page: "https://ona.test/customer/book",
        disposition: "report",
        sample: "Element innerHTML|<b>hello</b>",
      },
    ]);
  });

  it("reads the older report-uri shape", () => {
    const [v] = parseCspReports({
      "csp-report": {
        "document-uri": "https://ona.test/login?next=/admin",
        "violated-directive": "script-src-elem",
        "blocked-uri": "https://evil.test/x.js?k=1",
        "script-sample": "",
      },
    });
    expect(v).toMatchObject({ directive: "script-src-elem", blocked: "https://evil.test/x.js", page: "https://ona.test/login", disposition: "enforce" });
  });

  it("ignores anything else, and caps how much it reads", () => {
    expect(parseCspReports("nope")).toEqual([]);
    expect(parseCspReports({ "csp-report": {} })).toEqual([]);
    const many = Array.from({ length: 100 }, () => ({ type: "csp-violation", body: { effectiveDirective: "img-src" } }));
    expect(parseCspReports(many)).toHaveLength(20);
  });

  it("keeps the sample short", () => {
    const [v] = parseCspReports([{ type: "csp-violation", body: { effectiveDirective: "script-src", sample: "x".repeat(500) } }]);
    expect(v.sample).toHaveLength(40);
  });
});
