import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import ResetPasswordPage from "../page";

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const post = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useSearchParams: () => params.current }));
vi.mock("@/lib/api/client", () => ({ api: { post } }));

beforeEach(() => {
  post.mockReset();
});

function fill(password: string) {
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: password } });
}

describe("/reset-password", () => {
  it("explains an incomplete link instead of showing a form that cannot work", () => {
    params.current = new URLSearchParams("uid=abc");
    render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { name: /incomplete/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /new link/i }).getAttribute("href")).toBe("/forgot-password");
  });

  it("welcomes a customer ONA set up, and confirms with the token", async () => {
    params.current = new URLSearchParams("uid=U1&token=T1&welcome=1");
    post.mockResolvedValue({ detail: "ok" });
    render(<ResetPasswordPage />);
    expect(screen.getByRole("heading", { name: "Welcome to ONA Records" })).toBeTruthy();
    fill("A-good-Passw0rd!");
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/all set/i));
    expect(post).toHaveBeenCalledWith(
      "/auth/password-reset/confirm/",
      { uid: "U1", token: "T1", password: "A-good-Passw0rd!", password_confirm: "A-good-Passw0rd!" },
      { retries: 0 },
    );
  });

  it("offers a new link when the token has expired or been used", async () => {
    params.current = new URLSearchParams("uid=U1&token=old");
    post.mockRejectedValue(new ApiError("Bad", 400, "invalid", { token: ["This reset link has expired."] }));
    render(<ResetPasswordPage />);
    fill("A-good-Passw0rd!");
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/expired/));
    expect(screen.getByRole("link", { name: /new link/i })).toBeTruthy();
  });
});
