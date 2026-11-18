/** /customer/payments: each payment with its status in plain words, and a receipt only when there is one. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CustomerPaymentsPage from "@/app/customer/payments/page";
import type { MyPayment } from "@/lib/api/account";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ api: { get } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const row = (over: Partial<MyPayment>): MyPayment => ({
  id: "p1", created_at: "2026-11-10T10:00:00Z",
  booking: { id: "b1", reference: "ONA-1001", room: "Live Room", start_at: "2026-11-20T10:00:00Z" },
  how: "Paid online (Paystack)", status: "succeeded", status_display: "Succeeded",
  amount_pesewas: 40000, amount_display: "GHS 400.00", fee_pesewas: 0, fee_display: "",
  charged_display: "GHS 400.00", refunded_pesewas: 0, refunded_display: "", receipt_number: "R-2026-0001",
  ...over,
});

describe("CustomerPaymentsPage", () => {
  it("lists payments with status words and receipts only where they exist", async () => {
    get.mockResolvedValue({
      count: 3, next: null, previous: null,
      results: [
        row({}),
        row({ id: "p2", status: "pending", receipt_number: null }),
        row({ id: "p3", refunded_pesewas: 40000, refunded_display: "GHS 400.00" }),
      ],
    });
    render(<CustomerPaymentsPage />);
    expect(await screen.findAllByTestId("payment-row")).toHaveLength(3);
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Not finished")).toBeTruthy();
    expect(screen.getByText("Refunded")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Download receipt/ })).toHaveLength(2);
  });

  it("explains an empty history", async () => {
    get.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<CustomerPaymentsPage />);
    expect(await screen.findByText("No payments yet")).toBeTruthy();
  });
});
