import { expect, test, type Page } from "@playwright/test";

/**
 * Task 17 — UAT edge cases and the 390px sweep (docs/qa/uat-v0.1.md).
 *
 *  - Session expires while confirming a booking: the customer is sent to
 *    sign in and comes back to the same booking, re-checked, ready to
 *    confirm (lib/booking-draft.ts).
 *  - Every page, at 390px: no sideways scroll (ADR-013: unusable at 390px is
 *    a defect), exactly one h1, and no image without alt text.
 *
 * Needs the seeded backend; the admin pages also need E2E_ADMIN_*.
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
test.beforeEach(() => test.skip(!backendUp, `Backend not reachable at ${API}`));

async function register(page: Page): Promise<string> {
  const email = `e2e-uat-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/register");
  await page.getByRole("button", { name: /^I.m hiring/i }).click();
  await page.getByLabel(/first name/i).fill("Uat");
  await page.getByLabel(/last name/i).fill("Tester");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up|register/i }).click();
  await expect(page).toHaveURL(/\/customer(\/|$)/);
  return email;
}

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
}

test("a session that expires while confirming keeps the booking", async ({ page }) => {
  const email = await register(page);

  await page.goto("/customer/book");
  await page.getByRole("button", { name: /Mix Suite/ }).click();
  await page.getByRole("button", { name: /Engineer Three/ }).click();
  await page.getByRole("button", { name: /Recording session/ }).click();
  // Earlier runs leave bookings behind, so pick the day with the most free
  // slots rather than assuming one (QA: the last day had filled up).
  const days = page.getByRole("list", { name: "Days" }).getByRole("button");
  await expect(days.first()).toBeVisible();
  let best = 0;
  let bestFree = -1;
  for (let i = 0; i < (await days.count()); i++) {
    const free = Number(/(\d+) free/.exec((await days.nth(i).textContent()) ?? "")?.[1] ?? 0);
    if (free > bestFree) [best, bestFree] = [i, free];
  }
  expect(bestFree, "no free day left in the window — sweep e2e bookings").toBeGreaterThan(3);
  await days.nth(best).click();
  const slots = page.getByRole("list", { name: "Start times" }).getByRole("button", { disabled: false });
  await expect(slots.first()).toBeVisible();
  const slot = slots.nth(test.info().project.name === "mobile" ? 3 : 1);
  const time = (await slot.textContent())?.trim().slice(0, 5) ?? "";
  await slot.click();
  await page.getByRole("button", { name: "Continue" }).click();

  // The session dies exactly now: the create call 401s and so does the refresh.
  const expired = { status: 401, json: { error: { code: "not_authenticated", detail: { detail: "Session expired." } } } };
  await page.route("**/api/v1/studio/bookings/", (route) =>
    route.request().method() === "POST" ? route.fulfill(expired) : route.continue(),
  );
  await page.route("**/api/v1/auth/refresh/", (route) => route.fulfill(expired));
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page).toHaveURL(/\/login\?next=/);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await signIn(page, email, PASSWORD);

  // Back on the booking, re-checked against the calendar, ready to confirm.
  await expect(page).toHaveURL(/\/customer\/book/);
  await expect(page.getByRole("status").filter({ hasText: /kept your booking/ })).toBeVisible();
  const summary = page.getByRole("complementary", { name: "Session summary" });
  await expect(summary).toContainText("Mix Suite");
  await expect(summary).toContainText(time);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText(/ONA-[0-9A-F]{6}/).first()).toBeVisible();
});

const PUBLIC = ["/", "/studio", "/faqs", "/login", "/register", "/forgot-password", "/reset-password?uid=x&token=y", "/coming-soon"];
const CUSTOMER = ["/customer", "/customer/book", "/customer/bookings", "/customer/payments/return?reference=nope"];
const ADMIN = [
  "/admin", "/admin/bookings", "/admin/bookings/new", "/admin/customers", "/admin/payments", "/admin/jobs",
  "/admin/professionals", "/admin/catalogue", "/admin/content",
];

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const r = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    h1: document.querySelectorAll("h1").length,
    main: document.querySelectorAll("main").length,
    imgNoAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
  }));
  expect.soft(r.overflow, `${path}: page scrolls sideways by ${r.overflow}px`).toBeLessThanOrEqual(1);
  expect.soft(r.h1, `${path}: should have exactly one h1`).toBe(1);
  expect.soft(r.main, `${path}: should have exactly one <main> landmark (QA F10)`).toBe(1);
  expect.soft(r.imgNoAlt, `${path}: images without alt`).toBe(0);
}

test("every page holds together at 390px", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "The phone sweep runs in the 390px project");
  test.setTimeout(180_000);
  for (const path of PUBLIC) await audit(page, path);

  await register(page);
  for (const path of CUSTOMER) await audit(page, path);

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin/);
    for (const path of ADMIN) await audit(page, path);
  }
});
