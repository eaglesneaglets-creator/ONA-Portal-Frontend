/**
 * Account settings: details save through PATCH /auth/me/ and update the shell;
 * the password form checks itself before calling the API, keeps this session
 * with the fresh tokens, and shows the API's own field errors.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSettings } from "@/components/account/account-settings";
import { ApiError } from "@/lib/api/errors";
import { type User, useAuthStore } from "@/lib/auth/store";

const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
const setTokens = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { post, patch } }));
vi.mock("@/lib/api/tokens", async (orig) => ({ ...(await orig<object>()), setTokens }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const USER: User = {
  id: "u1", email: "ama@x.test", display_name: "Ama", role: "customer", first_name: "Ama",
  last_name: "", phone: "", public_ref: 1, is_email_verified: true, date_joined: "2026-11-01T10:00:00Z",
};

beforeEach(() => {
  post.mockReset();
  patch.mockReset();
  setTokens.mockReset();
  useAuthStore.setState({ user: USER, status: "authenticated" });
});

describe("AccountSettings", () => {
  it("saves details and updates the signed-in user", async () => {
    patch.mockResolvedValue({ ...USER, last_name: "Mensah", phone: "024 123 4567" });
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Mensah" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "024 123 4567" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(useAuthStore.getState().user?.last_name).toBe("Mensah"));
    expect(patch).toHaveBeenCalledWith("/auth/me/", { first_name: "Ama", last_name: "Mensah", phone: "024 123 4567" });
  });

  it("shows the API's phone error on the field", async () => {
    patch.mockRejectedValue(new ApiError("Invalid", 400, "validation_error", { phone: ["Use digits, spaces and an optional + only."] }));
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "call me" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Use digits, spaces and an optional + only.")).toBeTruthy();
  });

  it("checks the new passwords match before calling the API", () => {
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-one" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "New-pass-2026!" } });
    fireEvent.change(screen.getByLabelText("New password again"), { target: { value: "different-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByText("The two new passwords do not match.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps this session with the fresh tokens after a change", async () => {
    post.mockResolvedValue({ detail: "Password changed.", tokens: { access: "a2", refresh: "r2" } });
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-one" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "New-pass-2026!" } });
    fireEvent.change(screen.getByLabelText("New password again"), { target: { value: "New-pass-2026!" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(setTokens).toHaveBeenCalledWith({ access: "a2", refresh: "r2" }));
    expect(post).toHaveBeenCalledWith("/auth/password/", { current_password: "old-one", new_password: "New-pass-2026!" });
  });
});
