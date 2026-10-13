import { expect, test, type Page } from "@playwright/test";

/**
 * Register → login → correct portal, against the real Django API.
 *
 * Skips itself when the backend is unreachable so CI without a database
 * still passes the smoke suite. Locally: docker compose up in Backend/,
 * runserver on :8000, then `npm run test:e2e`.
 *
 * Test users use the `e2e-` email prefix so they are easy to sweep with
 * the backend's `delete_test_users` command.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "Studio-Session-2026!";

let backendUp = false;

test.beforeAll(async ({ request }) => {
  try {
    const res = await request.get(`${API}/health/`, { timeout: 3_000 });
    backendUp = res.ok();
  } catch {
    backendUp = false;
  }
});

test.beforeEach(() => {
  test.skip(!backendUp, `Backend not reachable at ${API} — auth journeys skipped`);
});

function uniqueEmail(role: string): string {
  return `e2e-${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function register(page: Page, role: "customer" | "professional", email: string) {
  await page.goto("/register");
  // Anchored: the customer card's body copy also contains "creative", so an
  // unanchored /creative/ matches both buttons and trips strict mode.
  const picker = role === "customer" ? /^I.m hiring/i : /^I.m a creative/i;
  await page.getByRole("button", { name: picker }).click();
  await page.getByLabel(/first name/i).fill("E2E");
  await page.getByLabel(/last name/i).fill(role);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByLabel(/confirm password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up|register/i }).click();
}

async function signOutEverywhere(page: Page) {
  // Clear the session the way a fresh browser would, rather than depending
  // on where the shell puts its sign-out button at each viewport.
  await page.context().clearCookies();
  await page.evaluate(() => window.localStorage.clear());
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
}

test("customer: register lands in /customer, and so does a fresh login", async ({ page }) => {
  const email = uniqueEmail("customer");
  await register(page, "customer", email);
  await expect(page).toHaveURL(/\/customer(\/|$)/);

  await signOutEverywhere(page);
  await login(page, email);
  await expect(page).toHaveURL(/\/customer(\/|$)/);
});

test("professional: register lands on the holding page, never in /pro (ADR-015)", async ({ page }) => {
  const email = uniqueEmail("professional");
  await register(page, "professional", email);
  await expect(page).toHaveURL(/\/coming-soon$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/account is ready/i);

  // Typing the URL directly must not work either.
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/coming-soon$/);

  await signOutEverywhere(page);
  await login(page, email);
  await expect(page).toHaveURL(/\/coming-soon$/);
});

test("a customer cannot reach /admin — redirected to their own portal", async ({ page }) => {
  const email = uniqueEmail("customer");
  await register(page, "customer", email);
  await expect(page).toHaveURL(/\/customer(\/|$)/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/customer(\/|$)/);
});

test("admin: login lands in /admin", async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run (admins cannot self-register)",
  );

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(adminEmail as string);
  await page.getByLabel(/^password/i).fill(adminPassword as string);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
});
