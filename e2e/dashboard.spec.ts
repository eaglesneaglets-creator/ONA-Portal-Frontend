import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Task 12 — the customer dashboard: summary, bookings list, reschedule,
 * cancel. Needs the seeded backend; skips without it.
 *
 * The booking is created through the API (the booking flow has its own
 * spec) on the "Mix Suite" room with "Engineer Three", on a day far enough
 * out — and different per project — that it does not collide with
 * booking.spec.ts, which uses Studio A.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "Studio-Session-2026!";

let backendUp = false;
test.beforeAll(async ({ request }) => {
  try {
    backendUp = (await request.get(`${API}/health/`, { timeout: 3_000 })).ok();
  } catch {
    backendUp = false;
  }
});
test.beforeEach(() => test.skip(!backendUp, `Backend not reachable at ${API}`));

function isoDay(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function registerCustomer(page: Page): Promise<string> {
  const email = `e2e-dash-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: /^I.m hiring/i }).click();
  await page.getByLabel(/first name/i).fill("Ama");
  await page.getByLabel(/last name/i).fill("Dash");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up|register/i }).click();
  await expect(page).toHaveURL(/\/customer(\/|$)/);
  return email;
}

async function bookViaApi(request: APIRequestContext, email: string, day: string, hour: number) {
  const login = await request.post(`${API}/auth/login/`, { data: { email, password: PASSWORD } });
  const access = (await login.json()).tokens.access as string;
  const pick = async (path: string, name: string) => {
    const page = await (await request.get(`${API}/studio/${path}/?page_size=100`)).json();
    return page.results.find((r: { name: string }) => r.name === name).id as string;
  };
  const res = await request.post(`${API}/studio/bookings/`, {
    headers: { Authorization: `Bearer ${access}` },
    data: {
      room: await pick("rooms", "Mix Suite"),
      engineer: await pick("engineers", "Engineer Three"),
      service: await pick("services", "Mixing (per song)"),
      start_at: `${day}T${String(hour).padStart(2, "0")}:00:00+00:00`, // Accra is UTC+0
      hours: 2,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).reference as string;
}

test("dashboard shows the booking; it can be rescheduled and cancelled", async ({ page, request }) => {
  const offset = test.info().project.name === "mobile" ? 41 : 40;
  const day = isoDay(offset);
  const email = await registerCustomer(page);
  const ref = await bookViaApi(request, email, day, 10);

  // Overview: greeting, numbers, next session.
  await page.goto("/customer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ama");
  await expect(page.getByTestId("stat-Upcoming sessions")).toHaveText("1");
  await expect(page.getByTestId("stat-Awaiting confirmation")).toHaveText("1");
  await expect(page.getByTestId("stat-Hours booked ahead")).toHaveText("2");
  await expect(page.getByRole("region", { name: "Next session" })).toContainText(ref);

  // Bookings list.
  await page.getByRole("link", { name: /manage bookings/i }).click();
  await expect(page).toHaveURL(/\/customer\/bookings$/);
  const row = page.getByTestId("booking-row").filter({ hasText: ref });
  await expect(row).toContainText("Awaiting confirmation");
  await expect(row).toContainText("10:00");

  // Row actions live in a menu. Invoice downloads as a PDF; no receipt
  // until a payment is confirmed.
  const menu = (r: typeof row) => r.getByRole("button", { name: `Actions for ${ref}` }).click();
  const item = (name: string | RegExp) => page.getByRole("menuitem", { name });
  const toastText = page.locator("[data-sonner-toast]");

  await menu(row);
  await expect(item("Receipt (PDF)")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await item("Invoice (PDF)").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`ONA-invoice-${ref}.pdf`);
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(await file.path());
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.toString("latin1")).toContain(ref);

  // Reschedule, in a dialog. The picker opens three days before the
  // booking, so the first offered day differs per project (offset 40 vs
  // 41) — the two projects never compete for the same hour.
  await menu(row);
  await item("Reschedule").click();
  const move = page.getByRole("dialog", { name: `Reschedule ${ref}` });
  const days = move.getByRole("list", { name: "Days" }).getByRole("button");
  await expect(days.first()).toContainText(/free/);
  await days.first().click();
  const times = move.getByRole("list", { name: "New start times" }).getByRole("button");
  await expect(times.first()).toBeVisible();
  await times.last().click();
  await expect(toastText.filter({ hasText: `${ref} moved to` })).toBeVisible();
  await expect(move).toHaveCount(0);

  // Cancel, confirmed in a dialog.
  const moved = page.getByTestId("booking-row").filter({ hasText: ref });
  await menu(moved);
  await item("Cancel booking").click();
  await page.getByRole("dialog", { name: `Cancel ${ref}?` }).getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(toastText.filter({ hasText: `${ref} was cancelled` })).toBeVisible();
  await expect(page.getByTestId("booking-row").filter({ hasText: ref })).toHaveCount(0);

  // It now sits under Past, marked cancelled, with no actions.
  await page.getByRole("tab", { name: "past" }).click();
  const past = page.getByTestId("booking-row").filter({ hasText: ref });
  await expect(past).toContainText("Cancelled");
  // Nothing left to change — but the invoice stays: it is a record.
  await menu(past);
  await expect(item(/reschedule|cancel booking/i)).toHaveCount(0);
  await expect(item("Invoice (PDF)")).toBeVisible();
});
