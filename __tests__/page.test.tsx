/**
 * Homepage (replaced the Task 11 token smoke page on 2026-10-13).
 *
 * Token coverage moved to CI's "Brand tokens" job, which checks the five
 * identity-guide colours are present in source. What matters on the real
 * homepage is that it sends people somewhere that exists, and never promises
 * the deferred marketplace (ADR-015).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Homepage", () => {
  it("has a single h1 that says what the studio offers", () => {
    render(<Home />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toMatch(/book the room/i);
  });

  it("links to the live catalogue and into booking", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /rooms & prices/i }).getAttribute("href")).toBe("/studio");
    const book = screen.getAllByRole("link", { name: /book studio time/i });
    expect(book.length).toBeGreaterThan(0);
    for (const a of book) expect(a.getAttribute("href")).toContain("next=%2Fcustomer%2Fbook");
  });

  it("does not link to the deferred marketplace", () => {
    render(<Home />);
    expect(screen.queryByRole("link", { name: /find a professional|explore talent|post a/i })).toBeNull();
    expect(screen.getByText(/coming next/i)).toBeTruthy();
  });
});
