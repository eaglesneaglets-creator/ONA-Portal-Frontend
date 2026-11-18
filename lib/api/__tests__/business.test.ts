import { describe, expect, it } from "vitest";

import { holdText, percentText } from "@/lib/api/business";

describe("business rule wording", () => {
  it("spells out hold times", () => {
    expect([30, 60, 90, 120, 135].map(holdText)).toEqual(
      ["30 minutes", "one hour", "1 hour 30 minutes", "2 hours", "2 hours 15 minutes"]);
  });
  it("prints rates from basis points", () => {
    expect([1500, 250, 1250, 5, 195].map(percentText)).toEqual(["15%", "2.5%", "12.5%", "0.05%", "1.95%"]);
  });
});
