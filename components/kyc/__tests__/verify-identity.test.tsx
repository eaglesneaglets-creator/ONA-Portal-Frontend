/**
 * The customer's identity check: each state the KYC service can report
 * renders the right screen, and the details step validates before it calls
 * the API and shows the API's own field errors when it refuses.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VerifyIdentity } from "@/components/kyc/verify-identity";
import { ApiError } from "@/lib/api/errors";
import type { MyIdentity, Verification } from "@/lib/api/kyc";

const get = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { get, post, patch } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function check(over: Partial<Verification> = {}): Verification {
  return {
    id: "v1",
    subject_ref: "u1",
    level: "identity",
    status: "draft",
    full_name: "",
    date_of_birth: null,
    id_type: "",
    id_number_last4: "",
    documents: [],
    missing: ["full_name", "date_of_birth", "id_type", "id_number", "document:id_front", "document:id_back", "document:selfie"],
    decision_reason: "",
    submitted_at: null,
    decided_at: null,
    created_at: "2026-11-17T10:00:00Z",
    updated_at: "2026-11-17T10:00:00Z",
    ...over,
  };
}
const mine = (v: Verification | null, available = true): MyIdentity => ({ available, verification: v });

const COMPLETE = check({
  full_name: "Ama Mensah",
  date_of_birth: "1995-04-02",
  id_type: "ghana_card",
  id_number_last4: "89-0",
  documents: [{ kind: "id_front" }, { kind: "id_back" }, { kind: "selfie" }],
  missing: [],
});

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
});

describe("VerifyIdentity", () => {
  it("says checks are not open yet when ONA is not connected to the KYC service", async () => {
    get.mockResolvedValue(mine(null, false));
    render(<VerifyIdentity />);
    expect(await screen.findByText(/identity checks are not open yet/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
  });

  it("explains the check, then starts it and opens the details step", async () => {
    get.mockResolvedValue(mine(null));
    post.mockResolvedValue(mine(check()));
    render(<VerifyIdentity />);
    const start = await screen.findByRole("button", { name: /^start/i });
    // What happens to their data is said before they begin.
    expect(screen.getByText(/deleted 90 days after the decision/i)).toBeTruthy();
    fireEvent.click(start);
    expect(post).toHaveBeenCalledWith("/kyc/");
    expect(await screen.findByLabelText(/full name/i)).toBeTruthy();
  });

  it("checks the details before sending, and shows the server's own field errors", async () => {
    get.mockResolvedValue(mine(check()));
    render(<VerifyIdentity />);
    const save = await screen.findByRole("button", { name: /save and continue/i });

    fireEvent.click(save);
    expect(await screen.findByText(/enter your full name/i)).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Ama Mensah" } });
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1995-04-02" } });
    fireEvent.click(screen.getByRole("radio", { name: /ghana card/i }));
    fireEvent.change(screen.getByLabelText(/ghana card number/i), { target: { value: "12345" } });
    patch.mockRejectedValue(
      new ApiError("Invalid", 400, "validation_error", { id_number: ["A Ghana Card number looks like GHA-123456789-0."] }),
    );
    fireEvent.click(save);
    expect(await screen.findByText(/looks like GHA-123456789-0/)).toBeTruthy();
    expect(patch).toHaveBeenCalledWith(
      "/kyc/details/",
      { full_name: "Ama Mensah", date_of_birth: "1995-04-02", id_type: "ghana_card", id_number: "12345" },
    );
  });

  it("opens at the first unfinished step, with the reviewer's note when changes were asked for", async () => {
    get.mockResolvedValue(mine({ ...COMPLETE, status: "changes_requested", decision_reason: "The back is blurred." }));
    render(<VerifyIdentity />);
    expect(await screen.findByText("The back is blurred.")).toBeTruthy();
    // Everything is filled in, so it opens on "Check and send".
    expect(screen.getByRole("button", { name: /send for review/i })).toBeTruthy();
    expect(screen.getByText("ending 89-0")).toBeTruthy();
  });

  it("sends for review and moves to the waiting screen", async () => {
    get.mockResolvedValue(mine(COMPLETE));
    post.mockResolvedValue(mine({ ...COMPLETE, status: "submitted", submitted_at: "2026-11-17T12:00:00Z" }));
    render(<VerifyIdentity />);
    fireEvent.click(await screen.findByRole("button", { name: /send for review/i }));
    expect(await screen.findByText(/we're checking your id/i)).toBeTruthy();
    expect(post).toHaveBeenCalledWith("/kyc/submit/");
  });

  it("shows a decision: verified, or not verified with the reason and a way to start again", async () => {
    get.mockResolvedValue(mine({ ...COMPLETE, status: "approved", decided_at: "2026-11-18T09:00:00Z" }));
    const { unmount } = render(<VerifyIdentity />);
    expect(await screen.findByText(/your identity is verified/i)).toBeTruthy();
    unmount();

    get.mockResolvedValue(mine({ ...COMPLETE, status: "rejected", decision_reason: "The selfie does not match." }));
    render(<VerifyIdentity />);
    expect(await screen.findByText(/the selfie does not match/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /start a new check/i })).toBeTruthy();
  });
});
