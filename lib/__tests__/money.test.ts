import { describe, expect, it } from "vitest";

import { parseGhsToPesewas, pesewasToInput } from "../money";

describe("parseGhsToPesewas", () => {
  it.each([
    ["150", 15000],
    ["150.5", 15050],
    ["150.05", 15005],
    ["0.29", 29], // the float trap: parseFloat("0.29") * 100 = 28.999…
    ["1,250.00", 125000],
    ["1,250", 125000],
    ["12,345,678.90", 1234567890],
    ["GHS 300", 30000],
    ["  20 ", 2000],
    ["0", 0],
  ])("%s → %d", (input, expected) => {
    expect(parseGhsToPesewas(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-5", "1.2.3", "12e3", ".", "1,50", "12,5", "1,2345", ",100"])("rejects %j", (input) => {
    expect(parseGhsToPesewas(input)).toBeNull();
  });
});

describe("pesewasToInput", () => {
  it("round-trips", () => {
    for (const p of [0, 5, 29, 15050, 125000]) {
      expect(parseGhsToPesewas(pesewasToInput(p))).toBe(p);
    }
  });
});
