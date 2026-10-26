import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Task 14 — the admin console: a staff member finds a customer's booking,
 * opens its record, confirms it, and the customer directory and payments
 * screens render.
 *
 * Needs the seeded backend and a staff login (admins cannot self-register):
 * set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD. Use an address WITHOUT the
 * `e2e-` prefix, or the test-data sweep would delete it.
 *
 * Payments and commission rows need a recorded payment, which arrives with
 * manual payment recording (Task 16); until then this spec checks the
 * payments screen renders its honest empty state or real rows.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PASSWORD = "Studio-Session-2026!";

let backendUp = false;
test.beforeAll(async ({ request }) => {
  try {
    backendUp = (await request.get(`${API}/health/`, { timeout: 3_000 })).ok();
  } catch {
    backendUp = false;
  }
});
test.beforeEach(() => {
  test.skip(!backendUp, `Backend not reachable at ${API}`);
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");
});

function isoDay(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

/** A fresh customer with one pending booking, made through the public API. */
async function customerWithBooking(request: APIRequestContext, day: string, hour: number) {
  const tag = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const email = `e2e-admin-${tag}@example.com`;
  const lastName = `Console${tag}`; // unique: the search must match exactly one
  const reg = await request.post(`${API}/auth/register/`, {
    data: { email, password: PASSWORD, password_confirm: PASSWORD, first_name: "Esi", last_name: lastName, role: "customer" },
  });
  expect(reg.status(), await reg.text()).toBe(201);
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
      engineer: await pick("engineers", "Engineer Two"),
      service: await pick("services", "Mixing (per song)"),
      start_at: `${day}T${String(hour).padStart(2, "0")}:00:00+00:00`,
      hours: 1,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return { lastName, reference: (await res.json()).reference as string };
}

test("admin finds a booking, opens its record, confirms it, then cancels it", async ({ page, request }) => {
  // A random slot 50-87 days out, away from the other specs (days 30-41), so
  // reruns and the two projects do not collide; the test cancels it at
  // the end, and the e2e- sweep removes it either way.
  const day = isoDay(50 + Math.floor(Math.random() * 38)); // inside the 90-day horizon
  const hour = 9 + Math.floor(Math.random() * 11);
  const { lastName, reference } = await customerWithBooking(request, day, hour);

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL as string);
  await page.getByLabel(/^password/i).fill(ADMIN_PASSWORD as string);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);

  // Overview: real numbers, and the new booking waits for confirmation.
  await expect(page.getByRole("heading", { level: 1, name: "Control room" })).toBeVisible();
  await expect(page.getByTestId("stat-Awaiting confirmation")).not.toHaveText("0");

  // Bookings: search by the customer's surname.
  await page.goto("/admin/bookings?when=all");
  await page.getByRole("searchbox", { name: "Search bookings" }).fill(lastName);
  const row = page.getByTestId("admin-booking-row").filter({ hasText: reference });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Awaiting confirmation");

  // The record: customer, money, no payments yet.
  await row.getByRole("button", { name: `Actions for ${reference}` }).click();
  await page.getByRole("menuitem", { name: "View details" }).click();
  const sheet = page.getByRole("dialog", { name: new RegExp(reference) });
  await expect(sheet).toContainText(`Esi ${lastName}`);
  await expect(sheet).toContainText("No payments recorded yet.");

  // Confirm from the record, with a note for the trail.
  await sheet.getByRole("button", { name: "Confirm booking" }).click();
  const confirm = page.getByRole("dialog", { name: `Confirm ${reference}?` });
  await confirm.getByLabel(/note for the record/i).fill("Confirmed by phone");
  await confirm.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: `${reference} confirmed` })).toBeVisible();

  // The sheet refreshes: confirmed, with the staff member and note in history.
  await expect(sheet).toContainText("Confirmed by");
  await expect(sheet).toContainText("Confirmed by phone");
  await expect(sheet.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
  // Cancel from the list's menu: confirmed in a dialog, the slot released.
  await page.keyboard.press("Escape");
  await expect(row).toContainText("Confirmed");
  await row.getByRole("button", { name: `Actions for ${reference}` }).click();
  await page.getByRole("menuitem", { name: "Cancel booking" }).click();
  const cancel = page.getByRole("dialog", { name: `Cancel ${reference}?` });
  await cancel.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: `${reference} cancelled` })).toBeVisible();
  await expect(row).toContainText("Cancelled");

  // Customers: the directory finds them.
  await page.goto("/admin/customers");
  await page.getByRole("searchbox", { name: "Search customers" }).fill(lastName);
  await expect(page.getByTestId("admin-customer-row")).toHaveCount(1);

  // Payments: renders real rows or the honest empty state — never fakes.
  await page.goto("/admin/payments");
  await expect(
    page.getByTestId("admin-payment-row").first().or(page.getByText("No payments yet")),
  ).toBeVisible();
});
