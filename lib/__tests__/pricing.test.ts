import { describe, expect, it } from "vitest";

import { depositPesewas, quotePesewas } from "@/lib/pricing";

// Same cases as the backend's test_pricing.py: the two must agree.
const studioOne = { hourly_rate_pesewas: null };

describe("quotePesewas", () => {
  it("hourly", () => {
    expect(quotePesewas(studioOne, { price_unit: "hour", base_price_pesewas: 15000 }, 3)).toBe(45000);
  });
  it("a day pass is one price for eight hours", () => {
    expect(quotePesewas(studioOne, { price_unit: "day", base_price_pesewas: 100000 }, 8)).toBe(100000);
  });
  it("per song charges songs, not hours", () => {
    expect(quotePesewas(studioOne, { price_unit: "song", base_price_pesewas: 400000 }, 5, 2)).toBe(800000);
  });
  it("adds room hire when a room has a rate", () => {
    expect(quotePesewas({ hourly_rate_pesewas: 5000 }, { price_unit: "hour", base_price_pesewas: 30000 }, 2)).toBe(70000);
  });
});

describe("depositPesewas", () => {
  it.each([
    [40000, 20000],
    [15001, 7501],
    [0, 0],
  ])("50%% of %i is %i", (total, expected) => {
    expect(depositPesewas(total)).toBe(expected);
  });
});
