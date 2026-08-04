import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("renders the primary onboarding content", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "To get started, edit the page.tsx file.",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Documentation" }).getAttribute("href"),
    ).toContain("nextjs.org/docs");
  });
});
