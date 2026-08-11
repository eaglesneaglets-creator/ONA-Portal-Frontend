import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/lib/auth/store";
import { PortalShell, type NavGroup } from "../portal-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/customer" }));

const groups: NavGroup[] = [{
  label: "Workspace",
  items: [
    { href: "/customer", label: "Overview" },
    { href: "/customer/bookings", label: "Bookings" },
  ],
}];

beforeEach(() => {
  useAuthStore.setState({
    status: "authenticated",
    user: {
      id: "u1", email: "review@example.com", display_name: "Review User",
      role: "customer", first_name: "Review", last_name: "User", phone: "",
      public_ref: 1, is_email_verified: true, date_joined: "2026-01-01T00:00:00Z",
    },
  });
});

describe("PortalShell mobile navigation", () => {
  it("exposes every portal destination from the compact header", () => {
    render(<PortalShell role="customer" groups={groups}><p>Content</p></PortalShell>);

    const opener = screen.getByRole("button", { name: "Open navigation" });
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(opener);

    const nav = screen.getByRole("navigation", { name: "Workspace mobile" });
    expect(within(nav).getByRole("link", { name: "Overview" })).toBeDefined();
    expect(within(nav).getByRole("link", { name: "Bookings" })).toBeDefined();
    expect(opener.getAttribute("aria-expanded")).toBe("true");
  });

  it("can be dismissed without navigating", () => {
    render(<PortalShell role="customer" groups={groups}><p>Content</p></PortalShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const nav = screen.getByRole("navigation", { name: "Workspace mobile" });
    fireEvent.click(within(nav).getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("navigation", { name: "Workspace mobile" })).toBeNull();
  });
});
