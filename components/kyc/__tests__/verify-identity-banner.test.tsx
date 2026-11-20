/**
 * The booking page's "Verify your identity to book" banner: shown only when
 * the API says booking waits on an identity check, and never on top of the
 * email banner — confirming the email comes first.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VerifyIdentityBanner } from "@/components/kyc/verify-identity-banner";
import { type User, useAuthStore } from "@/lib/auth/store";

const user = (over: Partial<User>): User =>
  ({ id: "u1", email: "ama@x.test", role: "customer", must_verify_email: false, must_verify_identity: false, ...over }) as User;

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

describe("VerifyIdentityBanner", () => {
  it("points to the identity check when booking needs one", () => {
    useAuthStore.setState({ user: user({ must_verify_identity: true }) });
    render(<VerifyIdentityBanner />);
    expect(screen.getByText(/verify your identity to book/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /verify now/i }).getAttribute("href")).toBe("/customer/verify");
  });

  it("stays away once a check is sent, and while the email still needs confirming", () => {
    useAuthStore.setState({ user: user({ must_verify_identity: false }) });
    const { rerender } = render(<VerifyIdentityBanner />);
    expect(screen.queryByTestId("verify-identity-banner")).toBeNull();

    useAuthStore.setState({ user: user({ must_verify_identity: true, must_verify_email: true }) });
    rerender(<VerifyIdentityBanner />);
    expect(screen.queryByTestId("verify-identity-banner")).toBeNull();
  });
});
