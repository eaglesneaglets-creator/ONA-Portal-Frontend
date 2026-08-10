import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

/**
 * The token check page (Task 11).
 *
 * These assertions are structural on purpose. jsdom does not run Tailwind,
 * so a test here CANNOT prove that `bg-ona-blue` resolves to #00108F — only
 * a browser can, and that was verified separately with computed styles.
 *
 * What this file does protect: that the page still names every token group,
 * so silently dropping a section is caught. When Task 14 replaces this page
 * with the real homepage, this test goes with it.
 */
describe("Token check page", () => {
  it("has a single h1 naming what the page is for", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Design tokens are live" }),
    ).toBeDefined();
  });

  it("shows every token group", () => {
    render(<Home />);

    for (const section of [
      "Brand gradient",
      "Brand colours",
      "Ink · contrast on white",
      "Signals",
      "Radii",
      "Type — Lato, four weights",
      "Controls",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: section }),
      ).toBeDefined();
    }
  });

  it("lists all five brand colours with their hex values", () => {
    render(<Home />);

    // The hex is asserted rather than the swatch, because the swatch is a
    // background colour jsdom cannot see. If a value drifts from the
    // Identity Guide, this catches it.
    for (const hex of [
      "#00108F",
      "#310C6D",
      "#64084B",
      "#970429",
      "#C90007",
    ]) {
      expect(screen.getByText(hex)).toBeDefined();
    }
  });

  it("renders both control variants", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: "Primary" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeDefined();
  });
});
