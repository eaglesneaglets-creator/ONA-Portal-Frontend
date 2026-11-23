import { fireEvent, render, screen, within } from "@testing-library/react";
import { CalendarDays, House } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/auth/store";
import { setViewportMobile } from "@/vitest.setup";
import { PortalShell, type NavGroup } from "../portal-shell";

let navPath = "/customer/bookings";
vi.mock("next/navigation", () => ({ usePathname: () => navPath }));

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
  navPath = "/customer/bookings";
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

describe("PortalShell on a phone, with tabs", () => {
  const tabbed: NavGroup[] = [
    {
      label: "Workspace",
      items: [
        { href: "/customer", label: "Overview" },
        { href: "/customer/bookings", label: "Bookings" },
        { href: "/customer/requests", label: "Requests", pending: true },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/customer/verify", label: "Verify identity" },
        { href: "/customer/settings", label: "Settings", hidden: true },
      ],
    },
  ];
  const tabs = [
    { href: "/customer", label: "Home", icon: House },
    { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
  ];

  function renderTabbed() {
    return render(
      <TooltipProvider>
        <PortalShell role="customer" groups={tabbed} tabs={tabs}><p>Content</p></PortalShell>
      </TooltipProvider>,
    );
  }

  it("shows the tabs plus More, and marks the current one", () => {
    setViewportMobile(true);
    renderTabbed();
    const bar = screen.getByRole("navigation", { name: "Main" });
    expect(within(bar).getByRole("link", { name: "Home" })).toBeDefined();
    expect(within(bar).getByRole("link", { name: "Bookings" }).getAttribute("aria-current")).toBe("page");
    expect(within(bar).getByRole("button", { name: "More" })).toBeDefined();
  });

  it("puts the rest under More, without the unbuilt or hidden items", () => {
    setViewportMobile(true);
    renderTabbed();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "Verify identity" })).toBeDefined();
    expect(within(sheet).queryByRole("link", { name: "Requests" })).toBeNull();
    expect(within(sheet).queryByRole("link", { name: "Bookings" })).toBeNull(); // already a tab
    expect(within(sheet).getByRole("link", { name: "Settings" })).toBeDefined(); // the account row
    expect(within(sheet).getByRole("button", { name: "Sign out" })).toBeDefined();
  });

  it("names a hidden page in the header instead of falling back to its parent", () => {
    navPath = "/customer/settings";
    renderTabbed();
    expect(screen.getByTestId("shell-title").textContent).toBe("Settings");
    // ...and does not list it in the sidebar.
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });
});
