/** The public header: Sign in for visitors; a role-aware account menu once signed in. */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderAccount } from "@/components/public/account-menu";
import { type User, useAuthStore } from "@/lib/auth/store";

const initialise = vi.hoisted(() => vi.fn(() => Promise.resolve()));

const user = (role: User["role"]): User => ({
  id: "u1", email: "ama@x.test", display_name: "Ama Mensah", role, first_name: "Ama", last_name: "Mensah",
  phone: "", public_ref: 1, is_email_verified: true, date_joined: "2026-11-01T10:00:00Z",
});

beforeEach(() => initialise.mockClear());

describe("HeaderAccount", () => {
  it("shows Sign in and Book a session to visitors", () => {
    useAuthStore.setState({ user: null, status: "anonymous", initialise });
    render(<HeaderAccount bookHref="/register?next=%2Fcustomer%2Fbook" />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Book a session" })).toBeTruthy();
    expect(initialise).toHaveBeenCalled();
  });

  it("gives a signed-in customer booking and their account, not Sign in", () => {
    useAuthStore.setState({ user: user("customer"), status: "authenticated", initialise });
    render(<HeaderAccount bookHref="/register" />);
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("link", { name: "Book a session" }).getAttribute("href")).toBe("/customer/book");
    expect(screen.getByRole("button", { name: "Account menu for Ama Mensah" })).toBeTruthy();
  });

  it("sends staff to the console", () => {
    useAuthStore.setState({ user: user("admin"), status: "authenticated", initialise });
    render(<HeaderAccount bookHref="/register" />);
    expect(screen.getByRole("link", { name: "Open console" }).getAttribute("href")).toBe("/admin");
  });

  it("holds the space while the session is still loading", () => {
    useAuthStore.setState({ user: null, status: "loading", initialise });
    render(<HeaderAccount bookHref="/register" />);
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
