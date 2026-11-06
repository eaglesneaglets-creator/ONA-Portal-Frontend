import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth/store";
import { setViewportMobile } from "@/vitest.setup";
import { PortalShell, type NavGroup } from "../portal-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/customer/bookings" }));

const groups: NavGroup[] = [{
  label: "Workspace",
  items: [
    { href: "/customer", label: "Overview" },
    { href: "/customer/bookings", label: "Bookings" },
  ],
}];

// The root layout provides TooltipProvider; the shell assumes it.
function renderShell() {
  return render(
    <TooltipProvider>
      <PortalShell role="customer" groups={groups}><p>Content</p></PortalShell>
    </TooltipProvider>,
  );
}

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

describe("PortalShell", () => {
  it("titles the page after the most specific matching nav item", () => {
    renderShell();
    // "/customer" is a prefix of the path, but "/customer/bookings" claims it.
    expect(screen.getByTestId("shell-title").textContent).toBe("Bookings");
    expect(screen.getByRole("link", { name: "Bookings" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
  });

  it("on a phone, exposes every destination from a drawer", () => {
    setViewportMobile(true);
    renderShell();

    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(within(drawer).getByRole("link", { name: "Overview" })).toBeDefined();
    expect(within(drawer).getByRole("link", { name: "Bookings" })).toBeDefined();
  });

  it("on a phone, closes the drawer once a destination is chosen", () => {
    setViewportMobile(true);
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Overview" }));
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
  });
});
