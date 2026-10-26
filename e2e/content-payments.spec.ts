import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Task 16 — staff content and manual money.
 *  - An FAQ added in the console appears on the public /faqs page (ISR: up
 *    to a minute later), then is removed again.
 *  - A payment taken off-platform is recorded from the booking record, shows
 *    as "Recorded by staff" with its commission on the payments screen, and a
 *    refund of part of it is recorded.
 *
 * Needs the seeded backend and E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
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

async function signInAsStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL as string);
  await page.getByLabel(/^password/i).fill(ADMIN_PASSWORD as string);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}

async function staffToken(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login/`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  return (await res.json()).tokens.access as string;
}

test("an FAQ edited by staff appears on the public page", async ({ page }) => {
  test.setTimeout(180_000);
  // Only one project needs to prove this; both would race on the same page cache.
  test.skip(test.info().project.name === "mobile", "Covered on desktop");
  const question = `E2E — is parking free ${Date.now()}?`;

  await signInAsStaff(page);
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "Add question" }).first().click();
  await page.getByLabel("Question", { exact: true }).fill(question);
  await page.getByLabel("Answer", { exact: true }).fill("Yes, on site.");
  await page.getByLabel("Order", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: /public pages/ })).toBeVisible();

  // ISR: the public page refreshes within a minute of the change.
  const visitor = await page.context().browser()!.newPage();
  await expect(async () => {
    await visitor.goto("/faqs");
    await expect(visitor.getByText(question)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 150_000, intervals: [5_000] });
  await visitor.close();

  // Tidy up through the console, as staff would.
  await page.getByTestId("faq-row").filter({ hasText: question }).click();
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(page.getByTestId("faq-row").filter({ hasText: question })).toHaveCount(0);
});

test("staff record an off-platform payment and a refund", async ({ page, request }) => {
  // A customer and a staff-made booking, through the API.
  const tag = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const email = `e2e-pay-${tag}@example.com`;
  const reg = await request.post(`${API}/auth/register/`, {
    data: { email, password: PASSWORD, password_confirm: PASSWORD, first_name: "Kwame", last_name: `Payer${tag}`, role: "customer" },
  });
  expect(reg.status(), await reg.text()).toBe(201);
  const token = await staffToken(request);
  const auth = { Authorization: `Bearer ${token}` };
  const customer = (await (await request.get(`${API}/admin/customers/?search=${encodeURIComponent(email)}`, { headers: auth })).json()).results[0];
  const pick = async (path: string, name: RegExp) =>
    ((await (await request.get(`${API}/studio/${path}/?page_size=100`)).json()).results as { id: string; name: string }[]).find((r) => name.test(r.name))!.id;
  const day = new Date(Date.now() + (95 + Math.floor(Math.random() * 60)) * 86_400_000).toISOString().slice(0, 10);
  const created = await request.post(`${API}/admin/bookings/`, {
    headers: auth,
    data: {
      customer: customer.id, room: await pick("rooms", /Studio B/), engineer: await pick("engineers", /Engineer Two/),
      service: await pick("services", /Recording/), start_at: `${day}T${String(9 + Math.floor(Math.random() * 10)).padStart(2, "0")}:00:00+00:00`,
      hours: 1, status: "confirmed",
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const ref = (await created.json()).reference as string;

  // Record the payment from the booking record.
  await signInAsStaff(page);
  await page.goto(`/admin/bookings?when=all&q=${ref}`);
  const row = page.getByTestId("admin-booking-row").filter({ hasText: ref });
  await row.getByRole("button", { name: `Actions for ${ref}` }).click();
  await page.getByRole("menuitem", { name: "View details" }).click();
  const sheet = page.getByRole("dialog", { name: new RegExp(ref) });
  await sheet.getByRole("button", { name: "Record a payment" }).click();
  const form = sheet.getByRole("group", { name: "Record a payment" });
  await expect(form.getByLabel("Amount (GHS)")).toHaveValue("120.00"); // the outstanding amount, from the server
  await form.getByLabel(/^Reference/).fill(`MOMO-${tag}`);
  await form.getByRole("button", { name: "Record payment" }).click();
  const toast = page.locator("[data-sonner-toast]");
  await expect(toast.filter({ hasText: `Payment recorded on ${ref}` })).toBeVisible();
  await expect(sheet).toContainText("Recorded by staff");
  await expect(sheet).toContainText("Mobile Money");

  // Refund part of it.
  await sheet.getByRole("button", { name: "Record a refund" }).click();
  const refund = sheet.getByRole("group", { name: "Record a refund" });
  await refund.getByLabel(/amount refunded/i).fill("20");
  await refund.getByLabel(/how it was returned/i).fill(`MoMo back, ref R-${tag}`);
  await refund.getByRole("button", { name: "Record refund" }).click();
  await expect(toast.filter({ hasText: `Refund recorded on ${ref}` })).toBeVisible();
  await expect(sheet).toContainText(`R-${tag}`);
  await page.keyboard.press("Escape");

  // The payments screen marks it as staff-recorded, with its commission rate.
  await page.goto("/admin/payments");
  await page.getByRole("searchbox", { name: "Search payments" }).fill(ref);
  const pay = page.getByTestId("admin-payment-row").filter({ hasText: ref });
  await expect(pay).toHaveCount(1);
  await expect(pay).toContainText(/Recorded by staff|recorded by staff/);
  await expect(pay).toContainText("GHS 120.00");
  await expect(pay).toContainText("GHS 100.00"); // still held after the refund
  if (test.info().project.name !== "mobile") await expect(pay).toContainText("%"); // commission rate column
});
