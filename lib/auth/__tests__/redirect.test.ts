import { describe, expect, it } from "vitest";

import { safeNext } from "../redirect";

describe("safeNext", () => {
  it("preserves an internal destination including query and hash", () => {
    expect(safeNext("/customer/bookings?page=2#upcoming")).toBe(
      "/customer/bookings?page=2#upcoming",
    );
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example/path",
    "/\\evil.example/path",
    "\\evil.example/path",
  ])("rejects an unsafe destination: %s", (value) => {
    expect(safeNext(value)).toBeNull();
  });
});
