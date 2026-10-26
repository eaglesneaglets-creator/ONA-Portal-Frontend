import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Task 15 — manual brokering. A staff member books a session for an existing
 * customer from the console, assigns a professional with a fee, and the
 * customer sees an ordinary booking in their own dashboard — with the
 * professional's stage name, never their contact details.
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

async function token(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API}/auth/login/`, { data: { email, password } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).tokens.access as string;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
}

async function pick(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test("staff book for a customer and add a professional; the customer sees it", async ({ page, request, browser }) => {
  const tag = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
  const email = `e2e-broker-${tag}@example.com`;
  const lastName = `Broker${tag}`;
  const reg = await request.post(`${API}/auth/register/`, {
    data: { email, password: PASSWORD, password_confirm: PASSWORD, first_name: "Efua", last_name: lastName, role: "customer" },
  });
  expect(reg.status(), await reg.text()).toBe(201);

  // A professional to assign, created through the staff API.
  const staffToken = await token(request, ADMIN_EMAIL as string, ADMIN_PASSWORD as string);
  const stage = `E2E Keys ${tag.slice(-6)}`;
  const pro = await request.post(`${API}/admin/professionals/`, {
    headers: { Authorization: `Bearer ${staffToken}` },
    data: { name: `Private Name ${tag}`, stage_name: stage, skills: ["keys"], rate_type: "per_song", rate_pesewas: 20000, phone: "0244999888" },
  });
  expect(pro.status(), await pro.text()).toBe(201);

  // A random slot well away from the other specs.
  const day = new Date(Date.now() + (50 + Math.floor(Math.random() * 38)) * 86_400_000).toISOString().slice(0, 10);
  const hour = 9 + Math.floor(Math.random() * 10);

  // ── Staff book it ─────────────────────────────────────
  await signIn(page, ADMIN_EMAIL as string, ADMIN_PASSWORD as string);
  await expect(page).toHaveURL(/\/admin(\/|$)/);
  await page.getByRole("link", { name: /new booking/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New booking" })).toBeVisible();

  await page.getByLabel("Find by name, email or phone").fill(lastName);
  await page.getByRole("list", { name: "Matching customers" }).getByRole("button", { name: new RegExp(lastName) }).click();

  await pick(page, "Room", /Studio B/);
  await pick(page, "Engineer", /Engineer Three/);
  await page.getByLabel("Date").fill(day);
  await pick(page, "Starts at", `${String(hour).padStart(2, "0")}:00`);
  await page.getByRole("button", { name: "Book session" }).click();

  const toast = page.locator("[data-sonner-toast]");
  await expect(toast.filter({ hasText: /booked for Efua/ })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/bookings\?/);
  const ref = /ONA-[0-9A-F]{6}/.exec((await toast.filter({ hasText: /booked for/ }).textContent()) ?? "")?.[0] as string;
  expect(ref).toBeTruthy();

  // ── Add the professional from the record ──────────────
  const row = page.getByTestId("admin-booking-row").filter({ hasText: ref });
  await row.getByRole("button", { name: `Actions for ${ref}` }).click();
  await page.getByRole("menuitem", { name: "View details" }).click();
  const sheet = page.getByRole("dialog", { name: new RegExp(ref) });
  await expect(sheet).toContainText("ONA staff");
  await sheet.getByRole("button", { name: "Assign a professional" }).click();
  await sheet.getByLabel("Professional", { exact: true }).click();
  await page.getByRole("option", { name: new RegExp(stage) }).click();
  await sheet.getByLabel(/fee to the customer/i).fill("150");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(toast.filter({ hasText: `${stage} assigned` })).toBeVisible();
  await expect(sheet).toContainText("GHS 150.00");

  // ── The customer sees an ordinary booking ─────────────
  const ctx = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const customer = await ctx.newPage();
  await signIn(customer, email, PASSWORD);
  await expect(customer).toHaveURL(/\/customer/);
  await customer.goto("/customer/bookings");
  const mine = customer.getByTestId("booking-row").filter({ hasText: ref });
  await expect(mine).toContainText(`With ${stage}`);
  await expect(mine).toContainText("GHS 150.00");
  await expect(mine).not.toContainText("Private Name");
  await expect(mine).not.toContainText("0244999888");
  await ctx.close();
});
