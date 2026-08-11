/**
 * Guard component behaviour.
 *
 * The rules are tested separately in roles.test.ts. This file tests the
 * wiring: that `loading` is not mistaken for signed-out, that a redirect
 * actually fires, and that protected content is never rendered before the
 * answer is known.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireAuth, RequireGuest } from "../guard";
import { useAuthStore, type User } from "../store";
import type { Role } from "../roles";

const replace = vi.fn();
let pathname = "/customer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
}));

function userWith(role: Role): User {
  return {
    id: "u1",
    email: "a@example.com",
    display_name: role === "professional" ? "Creative #028" : "Abena Darko",
    role,
    first_name: "Abena",
    last_name: "Darko",
    phone: "",
    public_ref: 1,
    is_email_verified: true,
    date_joined: "2026-01-01T00:00:00Z",
  };
}

beforeEach(() => {
  replace.mockClear();
  pathname = "/customer";
  useAuthStore.setState({ user: null, status: "loading" });
});

describe("RequireAuth", () => {
  it("shows the fallback while the session is being restored", () => {
    useAuthStore.setState({ user: null, status: "loading" });

    render(
      <RequireAuth fallback={<p>Checking…</p>}>
        <p>Secret dashboard</p>
      </RequireAuth>,
    );

    expect(screen.getByText("Checking…")).toBeDefined();
    expect(screen.queryByText("Secret dashboard")).toBeNull();
  });

  it("does NOT redirect while loading", () => {
    // The classic bug: treating `loading` as signed-out bounces the user to
    // /login on every reload, before the session has had a chance to
    // restore.
    useAuthStore.setState({ user: null, status: "loading" });

    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
    );

    expect(replace).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to login, remembering where they were going", () => {
    pathname = "/customer/bookings/ONA-2481";
    useAuthStore.setState({ user: null, status: "anonymous" });

    render(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
    );

    // Someone following a link to a specific booking should come back to
    // that booking after signing in, not to a generic dashboard.
    expect(replace).toHaveBeenCalledWith(
      "/login?next=%2Fcustomer%2Fbookings%2FONA-2481",
    );
    expect(screen.queryByText("Secret")).toBeNull();
  });

  it("renders the portal for the role it belongs to", () => {
    pathname = "/customer/bookings";
    useAuthStore.setState({ user: userWith("customer"), status: "authenticated" });

    render(
      <RequireAuth>
        <p>My bookings</p>
      </RequireAuth>,
    );

    expect(screen.getByText("My bookings")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a customer away from /admin to their own portal", () => {
    // This is the task's stated manual check, as an automated test.
    pathname = "/admin";
    useAuthStore.setState({ user: userWith("customer"), status: "authenticated" });

    render(
      <RequireAuth>
        <p>Admin console</p>
      </RequireAuth>,
    );

    expect(replace).toHaveBeenCalledWith("/customer");
    // And critically: the admin console must not render even for a frame.
    expect(screen.queryByText("Admin console")).toBeNull();
  });

  it("redirects a professional away from the customer portal", () => {
    pathname = "/customer";
    useAuthStore.setState({ user: userWith("professional"), status: "authenticated" });

    render(
      <RequireAuth>
        <p>Customer dashboard</p>
      </RequireAuth>,
    );

    expect(replace).toHaveBeenCalledWith("/pro");
    expect(screen.queryByText("Customer dashboard")).toBeNull();
  });
});

describe("RequireGuest", () => {
  it("shows the login form to an anonymous visitor", () => {
    pathname = "/login";
    useAuthStore.setState({ user: null, status: "anonymous" });

    render(
      <RequireGuest>
        <p>Sign in form</p>
      </RequireGuest>,
    );

    expect(screen.getByText("Sign in form")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
  });

  it("bounces a signed-in user to their portal", () => {
    pathname = "/login";
    useAuthStore.setState({ user: userWith("admin"), status: "authenticated" });

    render(
      <RequireGuest>
        <p>Sign in form</p>
      </RequireGuest>,
    );

    expect(replace).toHaveBeenCalledWith("/admin");
    expect(screen.queryByText("Sign in form")).toBeNull();
  });

  it("does not flash the form while loading", () => {
    pathname = "/login";
    useAuthStore.setState({ user: null, status: "loading" });

    render(
      <RequireGuest>
        <p>Sign in form</p>
      </RequireGuest>,
    );

    expect(screen.queryByText("Sign in form")).toBeNull();
  });
});
