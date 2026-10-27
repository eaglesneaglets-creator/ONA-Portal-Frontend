import { describe, expect, it } from "vitest";

import { isPaystackCheckout } from "@/lib/api/bookings";

// The Pay button only ever leaves for Paystack's hosted checkout.
describe("isPaystackCheckout", () => {
  it("accepts Paystack's checkout", () => {
    expect(isPaystackCheckout("https://checkout.paystack.com/nkdks46nymizns7")).toBe(true);
  });

  it.each([
    ["plain http", "http://checkout.paystack.com/x"],
    ["a lookalike host", "https://checkout.paystack.com.evil.test/x"],
    ["a subdomain trick", "https://evil.test/checkout.paystack.com"],
    ["another Paystack host", "https://paystack.com/pay/x"],
    ["credentials in the URL", "https://checkout.paystack.com@evil.test/x"],
    ["javascript:", "javascript:alert(1)"],
    ["not a URL", "checkout.paystack.com/x"],
    ["empty", ""],
  ])("refuses %s", (_label, url) => {
    expect(isPaystackCheckout(url)).toBe(false);
  });
});
